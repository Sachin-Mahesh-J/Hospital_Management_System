import { Prisma } from '@prisma/client'
import { database } from '../../database/database.service.js'
import type {
  CreatePrescriptionBody,
  ListPrescriptionsQuery,
} from './prescription.schemas.js'
import type { PrescriptionRecord } from './prescription.types.js'

type PrescriptionClient = Prisma.TransactionClient

function clientOrDefault(client?: PrescriptionClient): PrescriptionClient {
  return client ?? database.client
}

const prescriptionInclude = {
  patient: true,
  medicalRecord: { select: { id: true, status: true, patientId: true } },
  prescribedBy: { include: { employee: true } },
  items: {
    include: {
      medicine: true,
      dispenseRecords: {
        include: { reversal: true, dispensedBy: true },
        orderBy: { dispensedAt: 'asc' as const },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
} as const

function listWhere(
  query: ListPrescriptionsQuery,
): Prisma.PrescriptionWhereInput {
  return {
    ...(query.patientId ? { patientId: query.patientId } : {}),
    ...(query.medicalRecordId
      ? { medicalRecordId: query.medicalRecordId }
      : {}),
    ...(query.status ? { status: query.status } : {}),
  }
}

export async function listPrescriptions(
  query: ListPrescriptionsQuery,
): Promise<{ prescriptions: PrescriptionRecord[]; totalItems: number }> {
  const where = listWhere(query)
  const totalItems = await database.client.prescription.count({ where })
  const offset = (query.page - 1) * query.pageSize
  const prescriptions =
    offset >= totalItems
      ? []
      : await database.client.prescription.findMany({
          where,
          skip: offset,
          take: query.pageSize,
          include: prescriptionInclude,
          orderBy: [{ [query.sortBy]: query.sortOrder }, { id: 'asc' }],
        })
  return { prescriptions, totalItems }
}

export function findPrescriptionById(
  id: string,
  client?: PrescriptionClient,
): Promise<PrescriptionRecord | null> {
  return clientOrDefault(client).prescription.findUnique({
    where: { id },
    include: prescriptionInclude,
  })
}

export function findMedicalRecordForPrescription(
  id: string,
  client?: PrescriptionClient,
) {
  return clientOrDefault(client).medicalRecord.findUnique({
    where: { id },
    select: { id: true, status: true, patientId: true },
  })
}

export function findMedicineById(
  id: string,
  client?: PrescriptionClient,
) {
  return clientOrDefault(client).medicine.findUnique({
    where: { id },
  })
}

export function createPrescription(
  input: CreatePrescriptionBody,
  patientId: string,
  prescribedByDoctorId: string,
  client?: PrescriptionClient,
): Promise<PrescriptionRecord> {
  return clientOrDefault(client).prescription.create({
    data: {
      medicalRecordId: input.medicalRecordId,
      patientId,
      prescribedByDoctorId,
      status: 'active',
      notes: input.notes ?? null,
      items: {
        create: input.items.map((item) => ({
          medicineId: item.medicineId,
          dosage: item.dosage,
          route: item.route ?? null,
          frequency: item.frequency,
          duration: item.duration,
          instructions: item.instructions ?? null,
          quantityPrescribed: item.quantityPrescribed,
          unit: item.unit,
        })),
      },
    },
    include: prescriptionInclude,
  })
}

export function cancelPrescription(
  id: string,
  client?: PrescriptionClient,
): Promise<PrescriptionRecord> {
  return clientOrDefault(client).prescription.update({
    where: { id },
    data: {
      status: 'cancelled',
      updatedAt: new Date(),
    },
    include: prescriptionInclude,
  })
}

export async function lockPrescription(
  id: string,
  client: Prisma.TransactionClient,
): Promise<{ id: string; status: string } | null> {
  const rows = await client.$queryRaw<Array<{ id: string; status: string }>>`
    SELECT "id", "status"
    FROM "prescriptions"
    WHERE "id" = ${id}::uuid
    FOR UPDATE
  `
  return rows[0] ?? null
}

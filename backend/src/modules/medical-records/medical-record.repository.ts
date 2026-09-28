import { Prisma } from '@prisma/client'
import { database } from '../../database/database.service.js'
import type {
  CreateMedicalRecordBody,
  ListMedicalRecordsQuery,
} from './medical-record.schemas.js'
import type { MedicalRecordRecord } from './medical-record.types.js'

type MedicalRecordClient = Prisma.TransactionClient

function clientOrDefault(client?: MedicalRecordClient): MedicalRecordClient {
  return client ?? database.client
}

const medicalRecordInclude = {
  patient: true,
  author: true,
  appointment: true,
  admission: true,
  diagnoses: { orderBy: { createdAt: 'asc' as const } },
  treatments: { orderBy: { createdAt: 'asc' as const } },
  reports: { orderBy: { createdAt: 'asc' as const } },
  amends: { select: { id: true, status: true, occurredAt: true } },
  amendedBy: { select: { id: true, status: true, occurredAt: true } },
} as const

function listWhere(
  query: ListMedicalRecordsQuery,
): Prisma.MedicalRecordWhereInput {
  return {
    ...(query.patientId ? { patientId: query.patientId } : {}),
    ...(query.authorEmployeeId
      ? { authorEmployeeId: query.authorEmployeeId }
      : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.occurredAtFrom || query.occurredAtTo
      ? {
          occurredAt: {
            ...(query.occurredAtFrom
              ? { gte: new Date(query.occurredAtFrom) }
              : {}),
            ...(query.occurredAtTo ? { lt: new Date(query.occurredAtTo) } : {}),
          },
        }
      : {}),
  }
}

export async function listMedicalRecords(
  query: ListMedicalRecordsQuery,
): Promise<{ records: MedicalRecordRecord[]; totalItems: number }> {
  const where = listWhere(query)
  const totalItems = await database.client.medicalRecord.count({ where })
  const offset = (query.page - 1) * query.pageSize
  const records =
    offset >= totalItems
      ? []
      : await database.client.medicalRecord.findMany({
          where,
          skip: offset,
          take: query.pageSize,
          include: medicalRecordInclude,
          orderBy: [{ [query.sortBy]: query.sortOrder }, { id: 'asc' }],
        })
  return { records, totalItems }
}

export function findMedicalRecordById(
  id: string,
  client?: MedicalRecordClient,
): Promise<MedicalRecordRecord | null> {
  return clientOrDefault(client).medicalRecord.findUnique({
    where: { id },
    include: medicalRecordInclude,
  })
}

export function findPatientById(
  id: string,
  client?: MedicalRecordClient,
) {
  return clientOrDefault(client).patient.findUnique({
    where: { id },
    select: { id: true },
  })
}

export function findAppointmentContext(
  id: string,
  client?: MedicalRecordClient,
) {
  return clientOrDefault(client).appointment.findUnique({
    where: { id },
    select: { id: true, patientId: true },
  })
}

export function findAdmissionContext(
  id: string,
  client?: MedicalRecordClient,
) {
  return clientOrDefault(client).admission.findUnique({
    where: { id },
    select: { id: true, patientId: true },
  })
}

export function createMedicalRecord(
  input: CreateMedicalRecordBody,
  authorEmployeeId: string,
  client?: MedicalRecordClient,
): Promise<MedicalRecordRecord> {
  const data: Prisma.MedicalRecordUncheckedCreateInput = {
    patientId: input.patientId,
    authorEmployeeId,
    appointmentId: input.appointmentId ?? null,
    admissionId: input.admissionId ?? null,
    occurredAt: new Date(input.occurredAt),
    status: 'draft',
  }
  if (input.diagnoses?.length) {
    data.diagnoses = {
      create: input.diagnoses.map((item) => ({
        diagnosisText: item.diagnosisText,
      })),
    }
  }
  if (input.treatments?.length) {
    data.treatments = {
      create: input.treatments.map((item) => ({
        treatmentText: item.treatmentText,
      })),
    }
  }
  if (input.reports?.length) {
    data.reports = {
      create: input.reports.map((item) => ({
        title: item.title,
        reportText: item.reportText,
      })),
    }
  }
  return clientOrDefault(client).medicalRecord.create({
    data,
    include: medicalRecordInclude,
  })
}

export async function replaceDiagnoses(
  medicalRecordId: string,
  items: Array<{ diagnosisText: string }>,
  client: MedicalRecordClient,
): Promise<void> {
  await client.diagnosis.deleteMany({ where: { medicalRecordId } })
  if (items.length === 0) return
  await client.diagnosis.createMany({
    data: items.map((item) => ({
      medicalRecordId,
      diagnosisText: item.diagnosisText,
    })),
  })
}

export async function replaceTreatments(
  medicalRecordId: string,
  items: Array<{ treatmentText: string }>,
  client: MedicalRecordClient,
): Promise<void> {
  await client.treatment.deleteMany({ where: { medicalRecordId } })
  if (items.length === 0) return
  await client.treatment.createMany({
    data: items.map((item) => ({
      medicalRecordId,
      treatmentText: item.treatmentText,
    })),
  })
}

export async function replaceReports(
  medicalRecordId: string,
  items: Array<{ title: string; reportText: string }>,
  client: MedicalRecordClient,
): Promise<void> {
  await client.medicalReport.deleteMany({ where: { medicalRecordId } })
  if (items.length === 0) return
  await client.medicalReport.createMany({
    data: items.map((item) => ({
      medicalRecordId,
      title: item.title,
      reportText: item.reportText,
    })),
  })
}

export function updateDraftMedicalRecord(
  id: string,
  data: Prisma.MedicalRecordUncheckedUpdateInput,
  client?: MedicalRecordClient,
): Promise<MedicalRecordRecord> {
  return clientOrDefault(client).medicalRecord.update({
    where: { id },
    data,
    include: medicalRecordInclude,
  })
}

export function finalizeMedicalRecord(
  id: string,
  finalizedAt: Date,
  client?: MedicalRecordClient,
): Promise<MedicalRecordRecord> {
  return clientOrDefault(client).medicalRecord.update({
    where: { id },
    data: {
      status: 'final',
      finalizedAt,
      updatedAt: finalizedAt,
    },
    include: medicalRecordInclude,
  })
}

export function markMedicalRecordAmended(
  id: string,
  client?: MedicalRecordClient,
): Promise<MedicalRecordRecord> {
  return clientOrDefault(client).medicalRecord.update({
    where: { id },
    data: {
      status: 'amended',
      updatedAt: new Date(),
    },
    include: medicalRecordInclude,
  })
}

export function createAmendedMedicalRecord(
  input: {
    patientId: string
    authorEmployeeId: string
    appointmentId: string | null
    admissionId: string | null
    occurredAt: Date
    amendsMedicalRecordId: string
    finalizedAt: Date
    diagnoses?: Array<{ diagnosisText: string }> | undefined
    treatments?: Array<{ treatmentText: string }> | undefined
    reports?: Array<{ title: string; reportText: string }> | undefined
  },
  client?: MedicalRecordClient,
): Promise<MedicalRecordRecord> {
  const data: Prisma.MedicalRecordUncheckedCreateInput = {
    patientId: input.patientId,
    authorEmployeeId: input.authorEmployeeId,
    appointmentId: input.appointmentId,
    admissionId: input.admissionId,
    occurredAt: input.occurredAt,
    status: 'final',
    finalizedAt: input.finalizedAt,
    amendsMedicalRecordId: input.amendsMedicalRecordId,
  }
  if (input.diagnoses?.length) {
    data.diagnoses = {
      create: input.diagnoses.map((item) => ({
        diagnosisText: item.diagnosisText,
      })),
    }
  }
  if (input.treatments?.length) {
    data.treatments = {
      create: input.treatments.map((item) => ({
        treatmentText: item.treatmentText,
      })),
    }
  }
  if (input.reports?.length) {
    data.reports = {
      create: input.reports.map((item) => ({
        title: item.title,
        reportText: item.reportText,
      })),
    }
  }
  return clientOrDefault(client).medicalRecord.create({
    data,
    include: medicalRecordInclude,
  })
}

export async function lockMedicalRecord(
  id: string,
  client: Prisma.TransactionClient,
): Promise<{ id: string } | null> {
  const rows = await client.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "medical_records"
    WHERE "id" = ${id}::uuid
    FOR UPDATE
  `
  return rows[0] ?? null
}

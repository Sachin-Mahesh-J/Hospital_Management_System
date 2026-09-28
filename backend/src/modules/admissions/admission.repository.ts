import { Prisma } from '@prisma/client'
import { database } from '../../database/database.service.js'
import type { ListAdmissionsQuery } from './admission.schemas.js'
import type { AdmissionRecord } from './admission.types.js'

type AdmissionClient = Pick<
  Prisma.TransactionClient,
  'admission' | 'patient' | 'doctorProfile'
>

function clientOrDefault(client?: AdmissionClient): AdmissionClient {
  return client ?? database.client
}

const admissionInclude = {
  patient: true,
  attendingDoctor: { include: { employee: true } },
  createdBy: { select: { id: true, username: true } },
} as const

function admissionWhere(
  query: ListAdmissionsQuery,
): Prisma.AdmissionWhereInput {
  return {
    ...(query.patientId ? { patientId: query.patientId } : {}),
    ...(query.attendingDoctorId
      ? { attendingDoctorId: query.attendingDoctorId }
      : {}),
    ...(query.status ? { status: query.status } : {}),
  }
}

export async function listAdmissions(query: ListAdmissionsQuery): Promise<{
  admissions: AdmissionRecord[]
  totalItems: number
}> {
  const where = admissionWhere(query)
  const totalItems = await database.client.admission.count({ where })
  const offset = (query.page - 1) * query.pageSize
  const admissions =
    offset >= totalItems
      ? []
      : await database.client.admission.findMany({
          where,
          skip: offset,
          take: query.pageSize,
          include: admissionInclude,
          orderBy: [{ [query.sortBy]: query.sortOrder }, { id: 'asc' }],
        })
  return { admissions, totalItems }
}

export function findAdmissionById(
  id: string,
  client?: AdmissionClient,
): Promise<AdmissionRecord | null> {
  return clientOrDefault(client).admission.findUnique({
    where: { id },
    include: admissionInclude,
  })
}

export function findPatientById(
  id: string,
  client?: AdmissionClient,
) {
  return clientOrDefault(client).patient.findUnique({
    where: { id },
    select: { id: true, status: true },
  })
}

export function findDoctorForAssignment(
  id: string,
  client?: AdmissionClient,
) {
  return clientOrDefault(client).doctorProfile.findUnique({
    where: { id },
    include: { employee: true },
  })
}

export function findActiveAdmissionForPatient(
  patientId: string,
  client?: AdmissionClient,
) {
  return clientOrDefault(client).admission.findFirst({
    where: { patientId, status: 'admitted' },
    select: { id: true },
  })
}

export function createAdmission(
  input: {
    admissionNumber: string
    patientId: string
    attendingDoctorId: string | null
    admittedAt: Date
    reason: string
    createdByUserId: string
  },
  client?: AdmissionClient,
): Promise<AdmissionRecord> {
  return clientOrDefault(client).admission.create({
    data: {
      admissionNumber: input.admissionNumber,
      patientId: input.patientId,
      attendingDoctorId: input.attendingDoctorId,
      admittedAt: input.admittedAt,
      status: 'admitted',
      reason: input.reason,
      createdByUserId: input.createdByUserId,
    },
    include: admissionInclude,
  })
}

export function updateAdmissionFields(
  id: string,
  data: {
    attendingDoctorId?: string | null
    reason?: string
  },
  client?: AdmissionClient,
): Promise<AdmissionRecord> {
  return clientOrDefault(client).admission.update({
    where: { id },
    data: { ...data, updatedAt: new Date() },
    include: admissionInclude,
  })
}

export function dischargeAdmission(
  id: string,
  dischargeSummary: string,
  dischargedAt: Date,
  client?: AdmissionClient,
): Promise<AdmissionRecord> {
  return clientOrDefault(client).admission.update({
    where: { id },
    data: {
      status: 'discharged',
      dischargeSummary,
      dischargedAt,
      updatedAt: new Date(),
    },
    include: admissionInclude,
  })
}

export function cancelAdmission(
  id: string,
  client?: AdmissionClient,
): Promise<AdmissionRecord> {
  return clientOrDefault(client).admission.update({
    where: { id },
    data: {
      status: 'cancelled',
      updatedAt: new Date(),
    },
    include: admissionInclude,
  })
}

export async function lockAdmission(
  id: string,
  client: Prisma.TransactionClient,
): Promise<{ id: string } | null> {
  const rows = await client.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "admissions"
    WHERE "id" = ${id}::uuid
    FOR UPDATE
  `
  return rows[0] ?? null
}

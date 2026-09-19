import { Prisma, type Patient } from '@prisma/client'
import { database } from '../../database/database.service.js'
import type {
  CreatePatientBody,
  ListPatientsQuery,
  UpdatePatientBody,
} from './patient.schemas.js'

type PatientClient = Pick<Prisma.TransactionClient, 'patient'>

function clientOrDefault(client?: PatientClient): PatientClient {
  return client ?? database.client
}

function patientWhere(query: ListPatientsQuery): Prisma.PatientWhereInput {
  const search = query.search?.trim()
  return {
    ...(query.status ? { status: query.status } : {}),
    ...(search
      ? {
          OR: [
            { patientNumber: { contains: search, mode: 'insensitive' } },
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  }
}

export async function listPatients(query: ListPatientsQuery): Promise<{
  patients: Patient[]
  totalItems: number
}> {
  const where = patientWhere(query)
  const totalItems = await database.client.patient.count({ where })
  const offset = (query.page - 1) * query.pageSize
  const patients =
    offset >= totalItems
      ? []
      : await database.client.patient.findMany({
          where,
          skip: offset,
          take: query.pageSize,
          orderBy: [
            { [query.sortBy]: query.sortOrder },
            { id: 'asc' },
          ],
        })
  return { patients, totalItems }
}

export function findPatientById(
  id: string,
  client?: PatientClient,
): Promise<Patient | null> {
  return clientOrDefault(client).patient.findUnique({ where: { id } })
}

export function createPatient(
  patientNumber: string,
  input: CreatePatientBody,
  client?: PatientClient,
): Promise<Patient> {
  const data: Prisma.PatientCreateInput = {
    patientNumber,
    firstName: input.firstName,
    lastName: input.lastName,
    dateOfBirth: input.dateOfBirth
      ? new Date(`${input.dateOfBirth}T00:00:00.000Z`)
      : null,
    dateOfBirthPrecision: input.dateOfBirthPrecision,
    sexAtRegistration: input.sexAtRegistration ?? null,
    phone: input.phone ?? null,
    email: input.email ?? null,
    addressText: input.addressText ?? null,
    emergencyContactName: input.emergencyContactName ?? null,
    emergencyContactPhone: input.emergencyContactPhone ?? null,
  }
  return clientOrDefault(client).patient.create({
    data,
  })
}

export function updatePatient(
  id: string,
  input: UpdatePatientBody,
  client?: PatientClient,
): Promise<Patient> {
  const data: Prisma.PatientUpdateInput = { updatedAt: new Date() }
  if (input.firstName !== undefined) data.firstName = input.firstName
  if (input.lastName !== undefined) data.lastName = input.lastName
  if (input.dateOfBirth !== undefined) {
    data.dateOfBirth = input.dateOfBirth
      ? new Date(`${input.dateOfBirth}T00:00:00.000Z`)
      : null
  }
  if (input.dateOfBirthPrecision !== undefined) {
    data.dateOfBirthPrecision = input.dateOfBirthPrecision
  }
  if (input.sexAtRegistration !== undefined) {
    data.sexAtRegistration = input.sexAtRegistration
  }
  if (input.phone !== undefined) data.phone = input.phone
  if (input.email !== undefined) data.email = input.email
  if (input.addressText !== undefined) data.addressText = input.addressText
  if (input.emergencyContactName !== undefined) {
    data.emergencyContactName = input.emergencyContactName
  }
  if (input.emergencyContactPhone !== undefined) {
    data.emergencyContactPhone = input.emergencyContactPhone
  }
  if (input.status !== undefined) data.status = input.status
  return clientOrDefault(client).patient.update({ where: { id }, data })
}

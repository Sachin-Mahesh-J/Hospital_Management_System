import { randomUUID } from 'node:crypto'
import { Prisma } from '@prisma/client'
import { database } from '../../database/database.service.js'
import { ConflictError, NotFoundError } from '../../errors/httpErrors.js'
import { writeAudit } from '../audit/audit.service.js'
import {
  createPatient as createPatientRecord,
  findPatientById,
  listPatients as listPatientRecords,
  updatePatient as updatePatientRecord,
} from './patient.repository.js'
import type {
  CreatePatientBody,
  ListPatientsQuery,
  UpdatePatientBody,
} from './patient.schemas.js'
import { toPatientDto, type PatientDto } from './patient.types.js'

type MutationContext = {
  actorUserId: string
  requestId: string
}

function generatedPatientNumber(): string {
  return `P-${randomUUID()}`
}

function isPatientNumberCollision(error: unknown): boolean {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== 'P2002'
  ) {
    return false
  }
  const target = error.meta?.target
  return (
    (Array.isArray(target) && target.includes('patient_number')) ||
    target === 'uq_patients_patient_number'
  )
}

export async function getPatients(query: ListPatientsQuery): Promise<{
  data: PatientDto[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}> {
  const result = await listPatientRecords(query)
  return {
    data: result.patients.map(toPatientDto),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      totalItems: result.totalItems,
      totalPages: Math.ceil(result.totalItems / query.pageSize),
    },
  }
}

export async function getPatient(id: string): Promise<PatientDto> {
  const patient = await findPatientById(id)
  if (!patient) throw new NotFoundError('Patient was not found.')
  return toPatientDto(patient)
}

export async function registerPatient(
  input: CreatePatientBody,
  context: MutationContext,
): Promise<PatientDto> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const patient = await database.client.$transaction(async (transaction) => {
        const created = await createPatientRecord(
          generatedPatientNumber(),
          input,
          transaction,
        )
        await writeAudit(
          {
            actorUserId: context.actorUserId,
            action: 'patient.create',
            resourceType: 'patient',
            resourceId: created.id,
            outcome: 'success',
            requestId: context.requestId,
            metadata: { fields: Object.keys(input).sort() },
          },
          transaction,
        )
        return created
      })
      return toPatientDto(patient)
    } catch (error) {
      if (!isPatientNumberCollision(error)) throw error
    }
  }
  throw new ConflictError('A unique patient number could not be allocated.')
}

export async function changePatient(
  id: string,
  input: UpdatePatientBody,
  context: MutationContext,
): Promise<PatientDto> {
  const patient = await database.client.$transaction(async (transaction) => {
    const existing = await findPatientById(id, transaction)
    if (!existing) throw new NotFoundError('Patient was not found.')

    const updated = await updatePatientRecord(id, input, transaction)
    const statusChanged =
      input.status !== undefined && input.status !== existing.status
    await writeAudit(
      {
        actorUserId: context.actorUserId,
        action: statusChanged ? 'patient.status_update' : 'patient.update',
        resourceType: 'patient',
        resourceId: id,
        outcome: 'success',
        requestId: context.requestId,
        metadata: { fields: Object.keys(input).sort(), statusChanged },
      },
      transaction,
    )
    return updated
  })
  return toPatientDto(patient)
}

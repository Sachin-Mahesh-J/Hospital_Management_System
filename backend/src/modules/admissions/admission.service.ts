import { randomUUID } from 'node:crypto'
import { database } from '../../database/database.service.js'
import { isExclusionConstraint, isUniqueConstraint } from '../../database/prismaErrors.js'
import { ConflictError, NotFoundError } from '../../errors/httpErrors.js'
import { writeAudit } from '../audit/audit.service.js'
import {
  cancelAdmission as cancelAdmissionRecord,
  createAdmission as createAdmissionRecord,
  dischargeAdmission as dischargeAdmissionRecord,
  findActiveAdmissionForPatient,
  findAdmissionById,
  findDoctorForAssignment,
  findPatientById,
  listAdmissions as listAdmissionRecords,
  lockAdmission,
  updateAdmissionFields,
} from './admission.repository.js'
import type {
  CancelAdmissionBody,
  CreateAdmissionBody,
  DischargeAdmissionBody,
  ListAdmissionsQuery,
  UpdateAdmissionBody,
} from './admission.schemas.js'
import { toAdmissionDto, type AdmissionDto } from './admission.types.js'

type MutationContext = {
  actorUserId: string
  requestId: string
}

const ACTIVE_STATUS = 'admitted'
const ADMISSION_NUMBER_ATTEMPTS = 3

function generatedAdmissionNumber(): string {
  return `ADM-${randomUUID()}`
}

function isActiveAdmissionConflict(error: unknown): boolean {
  return (
    isUniqueConstraint(error, [
      'uq_admissions_one_active_per_patient',
      'patient_id',
    ]) || isExclusionConstraint(error, 'uq_admissions_one_active_per_patient')
  )
}

function isAdmissionNumberCollision(error: unknown): boolean {
  return isUniqueConstraint(error, [
    'uq_admissions_admission_number',
    'admission_number',
  ])
}

function mapAdmissionWriteError(error: unknown): never {
  if (isActiveAdmissionConflict(error)) {
    throw new ConflictError('This patient already has an active admission.')
  }
  throw error
}

async function assertAdmittablePatient(
  patientId: string,
  client: Parameters<typeof findPatientById>[1],
): Promise<void> {
  const patient = await findPatientById(patientId, client)
  if (!patient) throw new NotFoundError('Patient was not found.')
  if (patient.status === 'deceased') {
    throw new ConflictError('This patient cannot be admitted.')
  }
}

async function assertAssignableDoctor(
  doctorId: string,
  client: Parameters<typeof findDoctorForAssignment>[1],
): Promise<void> {
  const doctor = await findDoctorForAssignment(doctorId, client)
  if (!doctor || !doctor.employee) {
    throw new NotFoundError('Doctor was not found.')
  }
  if (doctor.status !== 'active' || doctor.employee.employmentStatus !== 'active') {
    throw new ConflictError('This doctor cannot be assigned to an admission.')
  }
}

async function assertNoActiveAdmission(
  patientId: string,
  client: Parameters<typeof findActiveAdmissionForPatient>[1],
): Promise<void> {
  const existing = await findActiveAdmissionForPatient(patientId, client)
  if (existing) {
    throw new ConflictError('This patient already has an active admission.')
  }
}

export async function getAdmissions(query: ListAdmissionsQuery): Promise<{
  data: AdmissionDto[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}> {
  const result = await listAdmissionRecords(query)
  return {
    data: result.admissions.map(toAdmissionDto),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      totalItems: result.totalItems,
      totalPages: Math.ceil(result.totalItems / query.pageSize),
    },
  }
}

export async function getAdmission(id: string): Promise<AdmissionDto> {
  const admission = await findAdmissionById(id)
  if (!admission) throw new NotFoundError('Admission was not found.')
  return toAdmissionDto(admission)
}

export async function registerAdmission(
  input: CreateAdmissionBody,
  context: MutationContext,
): Promise<AdmissionDto> {
  const attendingDoctorId = input.attendingDoctorId ?? null

  try {
    const admission = await database.client.$transaction(async (transaction) => {
      await assertAdmittablePatient(input.patientId, transaction)
      if (attendingDoctorId) {
        await assertAssignableDoctor(attendingDoctorId, transaction)
      }
      await assertNoActiveAdmission(input.patientId, transaction)

      let created: Awaited<ReturnType<typeof createAdmissionRecord>> | null = null
      let lastError: unknown
      for (let attempt = 0; attempt < ADMISSION_NUMBER_ATTEMPTS; attempt += 1) {
        try {
          created = await createAdmissionRecord(
            {
              admissionNumber: generatedAdmissionNumber(),
              patientId: input.patientId,
              attendingDoctorId,
              admittedAt: new Date(),
              reason: input.reason,
              createdByUserId: context.actorUserId,
            },
            transaction,
          )
          lastError = undefined
          break
        } catch (error) {
          lastError = error
          if (!isAdmissionNumberCollision(error)) {
            throw error
          }
        }
      }
      if (!created) {
        if (lastError) throw lastError
        throw new ConflictError('A unique admission number could not be allocated.')
      }

      await writeAudit(
        {
          actorUserId: context.actorUserId,
          action: 'admission.create',
          resourceType: 'admission',
          resourceId: created.id,
          outcome: 'success',
          requestId: context.requestId,
          metadata: {
            admissionNumber: created.admissionNumber,
            patientId: created.patientId,
            attendingDoctorId: created.attendingDoctorId,
            status: created.status,
            fields: ['patientId', 'attendingDoctorId', 'reason'].sort(),
          },
        },
        transaction,
      )
      return created
    })
    return toAdmissionDto(admission)
  } catch (error) {
    mapAdmissionWriteError(error)
  }
}

export async function changeAdmission(
  id: string,
  input: UpdateAdmissionBody,
  context: MutationContext,
): Promise<AdmissionDto> {
  try {
    const admission = await database.client.$transaction(async (transaction) => {
      const locked = await lockAdmission(id, transaction)
      if (!locked) throw new NotFoundError('Admission was not found.')
      const existing = await findAdmissionById(id, transaction)
      if (!existing) throw new NotFoundError('Admission was not found.')
      if (existing.status !== ACTIVE_STATUS) {
        throw new ConflictError('This admission cannot be updated.')
      }

      const changedFields: string[] = []
      const data: {
        attendingDoctorId?: string | null
        reason?: string
      } = {}

      if (input.attendingDoctorId !== undefined) {
        if (input.attendingDoctorId) {
          await assertAssignableDoctor(input.attendingDoctorId, transaction)
        }
        data.attendingDoctorId = input.attendingDoctorId
        changedFields.push('attendingDoctorId')
      }
      if (input.reason !== undefined) {
        data.reason = input.reason
        changedFields.push('reason')
      }

      const updated = await updateAdmissionFields(id, data, transaction)
      await writeAudit(
        {
          actorUserId: context.actorUserId,
          action: 'admission.update',
          resourceType: 'admission',
          resourceId: id,
          outcome: 'success',
          requestId: context.requestId,
          metadata: {
            admissionNumber: existing.admissionNumber,
            fields: changedFields,
          },
        },
        transaction,
      )
      return updated
    })
    return toAdmissionDto(admission)
  } catch (error) {
    mapAdmissionWriteError(error)
  }
}

export async function dischargeAdmission(
  id: string,
  input: DischargeAdmissionBody,
  context: MutationContext,
): Promise<AdmissionDto> {
  const admission = await database.client.$transaction(async (transaction) => {
    const locked = await lockAdmission(id, transaction)
    if (!locked) throw new NotFoundError('Admission was not found.')
    const existing = await findAdmissionById(id, transaction)
    if (!existing) throw new NotFoundError('Admission was not found.')
    if (existing.status !== ACTIVE_STATUS) {
      throw new ConflictError('This admission cannot be discharged.')
    }

    const dischargedAt = new Date()
    const updated = await dischargeAdmissionRecord(
      id,
      input.dischargeSummary,
      dischargedAt,
      transaction,
    )
    await writeAudit(
      {
        actorUserId: context.actorUserId,
        action: 'admission.discharge',
        resourceType: 'admission',
        resourceId: id,
        outcome: 'success',
        requestId: context.requestId,
        metadata: {
          admissionNumber: existing.admissionNumber,
          from: existing.status,
          to: 'discharged',
          fields: ['status', 'dischargedAt', 'dischargeSummary'],
        },
      },
      transaction,
    )
    return updated
  })
  return toAdmissionDto(admission)
}

export async function cancelAdmission(
  id: string,
  input: CancelAdmissionBody,
  context: MutationContext,
): Promise<AdmissionDto> {
  const admission = await database.client.$transaction(async (transaction) => {
    const locked = await lockAdmission(id, transaction)
    if (!locked) throw new NotFoundError('Admission was not found.')
    const existing = await findAdmissionById(id, transaction)
    if (!existing) throw new NotFoundError('Admission was not found.')
    if (existing.status !== ACTIVE_STATUS) {
      throw new ConflictError('This admission cannot be cancelled.')
    }

    const updated = await cancelAdmissionRecord(id, transaction)
    await writeAudit(
      {
        actorUserId: context.actorUserId,
        action: 'admission.cancel',
        resourceType: 'admission',
        resourceId: id,
        outcome: 'success',
        requestId: context.requestId,
        metadata: {
          admissionNumber: existing.admissionNumber,
          from: existing.status,
          to: 'cancelled',
          cancellationReason: input.reason,
          fields: ['status'],
        },
      },
      transaction,
    )
    return updated
  })
  return toAdmissionDto(admission)
}

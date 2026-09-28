import type { Prisma } from '@prisma/client'
import { findEmployeeByUserId } from '../../auth/clinicalIdentity.js'
import { database } from '../../database/database.service.js'
import { isUniqueConstraint } from '../../database/prismaErrors.js'
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../errors/httpErrors.js'
import { writeAudit } from '../audit/audit.service.js'
import {
  createAmendedMedicalRecord,
  createMedicalRecord as createMedicalRecordRecord,
  findAdmissionContext,
  findAppointmentContext,
  findMedicalRecordById,
  findPatientById,
  finalizeMedicalRecord as finalizeMedicalRecordRecord,
  listMedicalRecords as listMedicalRecordRows,
  lockMedicalRecord,
  markMedicalRecordAmended,
  replaceDiagnoses,
  replaceReports,
  replaceTreatments,
  updateDraftMedicalRecord,
} from './medical-record.repository.js'
import type {
  AmendMedicalRecordBody,
  CreateMedicalRecordBody,
  ListMedicalRecordsQuery,
  UpdateMedicalRecordBody,
} from './medical-record.schemas.js'
import {
  toMedicalRecordDetailDto,
  toMedicalRecordListDto,
  type MedicalRecordDetailDto,
  type MedicalRecordListDto,
} from './medical-record.types.js'

type MutationContext = {
  actorUserId: string
  requestId: string
}

type TransactionClient = Prisma.TransactionClient

function hasClinicalContent(record: {
  diagnoses: unknown[]
  treatments: unknown[]
  reports: unknown[]
}): boolean {
  return (
    record.diagnoses.length > 0 ||
    record.treatments.length > 0 ||
    record.reports.length > 0
  )
}

function auditChangedFields(input: object): string[] {
  return Object.keys(input).sort()
}

async function requireLinkedAuthor(
  userId: string,
  client: TransactionClient,
): Promise<string> {
  const employee = await findEmployeeByUserId(userId, client)
  if (!employee) {
    throw new ConflictError(
      'The authenticated user is not linked to an employee record.',
    )
  }
  return employee.id
}

async function assertPatientExists(
  patientId: string,
  client: TransactionClient,
): Promise<void> {
  const patient = await findPatientById(patientId, client)
  if (!patient) throw new NotFoundError('Patient was not found.')
}

async function assertCareContext(
  patientId: string,
  appointmentId: string | null | undefined,
  admissionId: string | null | undefined,
  client: TransactionClient,
): Promise<void> {
  if (appointmentId && admissionId) {
    throw new ValidationError(
      'A medical record may have an appointment or an admission, not both.',
      [
        {
          path: 'admissionId',
          message: 'A medical record may have an appointment or an admission, not both.',
        },
      ],
    )
  }
  if (appointmentId) {
    const appointment = await findAppointmentContext(appointmentId, client)
    if (!appointment) throw new NotFoundError('Appointment was not found.')
    if (appointment.patientId !== patientId) {
      throw new ConflictError(
        'The appointment does not belong to this patient.',
      )
    }
  }
  if (admissionId) {
    const admission = await findAdmissionContext(admissionId, client)
    if (!admission) throw new NotFoundError('Admission was not found.')
    if (admission.patientId !== patientId) {
      throw new ConflictError('The admission does not belong to this patient.')
    }
  }
}

async function assertNoAmendmentCycle(
  originId: string,
  client: TransactionClient,
): Promise<void> {
  const seen = new Set<string>()
  let current: string | null = originId
  while (current) {
    if (seen.has(current)) {
      throw new ConflictError('An amendment chain must not create a cycle.')
    }
    seen.add(current)
    const row = await findMedicalRecordById(current, client)
    current = row?.amendsMedicalRecordId ?? null
  }
}

export async function getMedicalRecords(
  query: ListMedicalRecordsQuery,
): Promise<{
  data: MedicalRecordListDto[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}> {
  const result = await listMedicalRecordRows(query)
  return {
    data: result.records.map(toMedicalRecordListDto),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      totalItems: result.totalItems,
      totalPages: Math.ceil(result.totalItems / query.pageSize),
    },
  }
}

export async function getMedicalRecord(
  id: string,
): Promise<MedicalRecordDetailDto> {
  const record = await findMedicalRecordById(id)
  if (!record) throw new NotFoundError('Medical record was not found.')
  return toMedicalRecordDetailDto(record)
}

export async function registerMedicalRecord(
  input: CreateMedicalRecordBody,
  context: MutationContext,
): Promise<MedicalRecordDetailDto> {
  const record = await database.client.$transaction(async (transaction) => {
    const authorEmployeeId = await requireLinkedAuthor(
      context.actorUserId,
      transaction,
    )
    await assertPatientExists(input.patientId, transaction)
    await assertCareContext(
      input.patientId,
      input.appointmentId,
      input.admissionId,
      transaction,
    )
    const created = await createMedicalRecordRecord(
      input,
      authorEmployeeId,
      transaction,
    )
    await writeAudit(
      {
        actorUserId: context.actorUserId,
        action: 'medical_record.create',
        resourceType: 'medical_record',
        resourceId: created.id,
        outcome: 'success',
        requestId: context.requestId,
        metadata: { fields: auditChangedFields(input) },
      },
      transaction,
    )
    return created
  })
  return toMedicalRecordDetailDto(record)
}

export async function changeDraftMedicalRecord(
  id: string,
  input: UpdateMedicalRecordBody,
  context: MutationContext,
): Promise<MedicalRecordDetailDto> {
  const record = await database.client.$transaction(async (transaction) => {
    const locked = await lockMedicalRecord(id, transaction)
    if (!locked) throw new NotFoundError('Medical record was not found.')
    const existing = await findMedicalRecordById(id, transaction)
    if (!existing) throw new NotFoundError('Medical record was not found.')
    if (existing.status !== 'draft') {
      throw new ConflictError('Only draft medical records can be updated.')
    }

    const appointmentId =
      input.appointmentId === undefined
        ? existing.appointmentId
        : input.appointmentId
    const admissionId =
      input.admissionId === undefined ? existing.admissionId : input.admissionId
    await assertCareContext(
      existing.patientId,
      appointmentId,
      admissionId,
      transaction,
    )

    const data: Prisma.MedicalRecordUncheckedUpdateInput = {
      updatedAt: new Date(),
    }
    if (input.occurredAt !== undefined) {
      data.occurredAt = new Date(input.occurredAt)
    }
    if (input.appointmentId !== undefined) {
      data.appointmentId = input.appointmentId
    }
    if (input.admissionId !== undefined) {
      data.admissionId = input.admissionId
    }

    await updateDraftMedicalRecord(id, data, transaction)
    if (input.diagnoses) {
      await replaceDiagnoses(id, input.diagnoses, transaction)
    }
    if (input.treatments) {
      await replaceTreatments(id, input.treatments, transaction)
    }
    if (input.reports) {
      await replaceReports(id, input.reports, transaction)
    }

    const updated = await findMedicalRecordById(id, transaction)
    if (!updated) throw new NotFoundError('Medical record was not found.')
    await writeAudit(
      {
        actorUserId: context.actorUserId,
        action: 'medical_record.update',
        resourceType: 'medical_record',
        resourceId: id,
        outcome: 'success',
        requestId: context.requestId,
        metadata: { fields: auditChangedFields(input) },
      },
      transaction,
    )
    return updated
  })
  return toMedicalRecordDetailDto(record)
}

export async function finalizeMedicalRecord(
  id: string,
  context: MutationContext,
): Promise<MedicalRecordDetailDto> {
  const record = await database.client.$transaction(async (transaction) => {
    await requireLinkedAuthor(context.actorUserId, transaction)
    const locked = await lockMedicalRecord(id, transaction)
    if (!locked) throw new NotFoundError('Medical record was not found.')
    const existing = await findMedicalRecordById(id, transaction)
    if (!existing) throw new NotFoundError('Medical record was not found.')
    if (existing.status !== 'draft') {
      throw new ConflictError('Only draft medical records can be finalized.')
    }
    if (!hasClinicalContent(existing)) {
      throw new ConflictError(
        'A medical record must include a diagnosis, treatment, or report before finalization.',
      )
    }

    const finalized = await finalizeMedicalRecordRecord(
      id,
      new Date(),
      transaction,
    )
    await writeAudit(
      {
        actorUserId: context.actorUserId,
        action: 'medical_record.finalize',
        resourceType: 'medical_record',
        resourceId: id,
        outcome: 'success',
        requestId: context.requestId,
        metadata: { fields: ['status', 'finalizedAt'] },
      },
      transaction,
    )
    return finalized
  })
  return toMedicalRecordDetailDto(record)
}

export async function amendMedicalRecord(
  id: string,
  input: AmendMedicalRecordBody,
  context: MutationContext,
): Promise<MedicalRecordDetailDto> {
  try {
    const successor = await database.client.$transaction(async (transaction) => {
      const authorEmployeeId = await requireLinkedAuthor(
        context.actorUserId,
        transaction,
      )
      const locked = await lockMedicalRecord(id, transaction)
      if (!locked) throw new NotFoundError('Medical record was not found.')
      const predecessor = await findMedicalRecordById(id, transaction)
      if (!predecessor) throw new NotFoundError('Medical record was not found.')
      if (predecessor.status !== 'final') {
        throw new ConflictError('Only a final medical record can be amended.')
      }
      if (predecessor.amendedBy) {
        throw new ConflictError(
          'This medical record already has an amendment successor.',
        )
      }

      const occurredAt = new Date(input.occurredAt)
      if (occurredAt.getTime() <= predecessor.occurredAt.getTime()) {
        throw new ValidationError(
          'The amendment must occur after the record it amends.',
          [
            {
              path: 'occurredAt',
              message: 'The amendment must occur after the record it amends.',
            },
          ],
        )
      }

      await assertNoAmendmentCycle(id, transaction)
      await assertCareContext(
        predecessor.patientId,
        input.appointmentId,
        input.admissionId,
        transaction,
      )

      const draftChildren = {
        diagnoses: input.diagnoses ?? [],
        treatments: input.treatments ?? [],
        reports: input.reports ?? [],
      }
      if (!hasClinicalContent(draftChildren)) {
        throw new ConflictError(
          'A medical record must include a diagnosis, treatment, or report before finalization.',
        )
      }

      const now = new Date()
      const created = await createAmendedMedicalRecord(
        {
          patientId: predecessor.patientId,
          authorEmployeeId,
          appointmentId: input.appointmentId ?? null,
          admissionId: input.admissionId ?? null,
          occurredAt,
          amendsMedicalRecordId: id,
          finalizedAt: now,
          diagnoses: input.diagnoses,
          treatments: input.treatments,
          reports: input.reports,
        },
        transaction,
      )
      await markMedicalRecordAmended(id, transaction)
      await writeAudit(
        {
          actorUserId: context.actorUserId,
          action: 'medical_record.amend',
          resourceType: 'medical_record',
          resourceId: id,
          outcome: 'success',
          requestId: context.requestId,
          metadata: {
            fields: auditChangedFields(input),
            successorId: created.id,
            reason: input.reason,
          },
        },
        transaction,
      )
      await writeAudit(
        {
          actorUserId: context.actorUserId,
          action: 'medical_record.create',
          resourceType: 'medical_record',
          resourceId: created.id,
          outcome: 'success',
          requestId: context.requestId,
          metadata: {
            fields: auditChangedFields(input),
            amends: id,
          },
        },
        transaction,
      )
      return created
    })
    return toMedicalRecordDetailDto(successor)
  } catch (error) {
    if (
      isUniqueConstraint(error, ['uq_medical_records_amends_medical_record_id'])
    ) {
      throw new ConflictError(
        'This medical record already has an amendment successor.',
      )
    }
    throw error
  }
}

import type { Prisma } from '@prisma/client'
import { database } from '../../database/database.service.js'
import {
  isCheckConstraint,
  isExclusionConstraint,
} from '../../database/prismaErrors.js'
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../errors/httpErrors.js'
import { writeAudit } from '../audit/audit.service.js'
import {
  cancelAppointment as cancelAppointmentRecord,
  createAppointment as createAppointmentRecord,
  findAppointmentById,
  findDoctorForBooking,
  findPatientById,
  listAppointments as listAppointmentRecords,
  lockAppointment,
  lockAvailableSchedule,
  updateAppointmentReason,
  updateAppointmentStatus as updateAppointmentStatusRecord,
} from './appointment.repository.js'
import type {
  CancelAppointmentBody,
  CreateAppointmentBody,
  ListAppointmentsQuery,
  RescheduleAppointmentBody,
  UpdateAppointmentBody,
  UpdateAppointmentStatusBody,
} from './appointment.schemas.js'
import { toAppointmentDto, type AppointmentDto } from './appointment.types.js'

type MutationContext = {
  actorUserId: string
  requestId: string
}

const RESCHEDULE_CANCELLATION_REASON = 'Rescheduled'
const ACTIVE_STATUSES = new Set(['scheduled', 'checked_in'])
const STATUS_TRANSITIONS: Record<string, readonly string[]> = {
  scheduled: ['checked_in', 'no_show'],
  checked_in: ['completed'],
  completed: [],
  cancelled: [],
  no_show: [],
}

function mapAppointmentWriteError(error: unknown): never {
  if (isExclusionConstraint(error, 'ex_appointments_doctor_active_overlap')) {
    throw new ConflictError(
      'This doctor already has an active appointment in that interval.',
    )
  }
  if (isExclusionConstraint(error, 'ex_appointments_patient_active_overlap')) {
    throw new ConflictError(
      'This patient already has an active appointment in that interval.',
    )
  }
  if (isCheckConstraint(error) || isExclusionConstraint(error, 'ck_appointments_interval')) {
    throw new ValidationError('Appointment end must be after appointment start.', [
      { path: 'endsAt', message: 'Appointment end must be after appointment start.' },
    ])
  }
  throw error
}

function assertInterval(startsAt: Date, endsAt: Date): void {
  if (endsAt.getTime() <= startsAt.getTime()) {
    throw new ValidationError('Appointment end must be after appointment start.', [
      { path: 'endsAt', message: 'Appointment end must be after appointment start.' },
    ])
  }
}

async function assertPatientExists(
  patientId: string,
  client: Parameters<typeof findPatientById>[1],
): Promise<void> {
  const patient = await findPatientById(patientId, client)
  if (!patient) throw new NotFoundError('Patient was not found.')
}

async function assertBookableDoctor(
  doctorId: string,
  client: Parameters<typeof findDoctorForBooking>[1],
): Promise<void> {
  const doctor = await findDoctorForBooking(doctorId, client)
  if (!doctor) throw new NotFoundError('Doctor was not found.')
  if (doctor.status !== 'active') {
    throw new ConflictError('This doctor is not available for appointment booking.')
  }
  if (doctor.employee.employmentStatus !== 'active') {
    throw new ConflictError(
      'This doctor is not available for appointment booking.',
    )
  }
}

async function assertAvailableSchedule(
  doctorId: string,
  startsAt: Date,
  endsAt: Date,
  client: Prisma.TransactionClient,
): Promise<void> {
  const schedule = await lockAvailableSchedule(doctorId, startsAt, endsAt, client)
  if (!schedule) {
    throw new ConflictError(
      'The appointment does not fit an available doctor schedule.',
    )
  }
}

async function assertBookingRules(
  input: {
    patientId: string
    doctorId: string
    startsAt: string
    endsAt: string
  },
  client: Prisma.TransactionClient,
): Promise<{ startsAt: Date; endsAt: Date }> {
  await assertPatientExists(input.patientId, client)
  await assertBookableDoctor(input.doctorId, client)
  const startsAt = new Date(input.startsAt)
  const endsAt = new Date(input.endsAt)
  assertInterval(startsAt, endsAt)
  await assertAvailableSchedule(input.doctorId, startsAt, endsAt, client)
  return { startsAt, endsAt }
}

async function assertNoRescheduleCycle(
  originId: string,
  client: Parameters<typeof findAppointmentById>[1],
): Promise<void> {
  const seen = new Set<string>()
  let current: string | null = originId
  while (current) {
    if (seen.has(current)) {
      throw new ConflictError('A rescheduling chain must not create a cycle.')
    }
    seen.add(current)
    const row = await findAppointmentById(current, client)
    current = row?.rescheduledFromAppointmentId ?? null
  }
}

export async function getAppointments(query: ListAppointmentsQuery): Promise<{
  data: AppointmentDto[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}> {
  const result = await listAppointmentRecords(query)
  return {
    data: result.appointments.map(toAppointmentDto),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      totalItems: result.totalItems,
      totalPages: Math.ceil(result.totalItems / query.pageSize),
    },
  }
}

export async function getAppointment(id: string): Promise<AppointmentDto> {
  const appointment = await findAppointmentById(id)
  if (!appointment) throw new NotFoundError('Appointment was not found.')
  return toAppointmentDto(appointment)
}

export async function registerAppointment(
  input: CreateAppointmentBody,
  context: MutationContext,
): Promise<AppointmentDto> {
  try {
    const appointment = await database.client.$transaction(async (transaction) => {
      await assertBookingRules(input, transaction)
      const created = await createAppointmentRecord(
        input,
        context.actorUserId,
        transaction,
      )
      await writeAudit(
        {
          actorUserId: context.actorUserId,
          action: 'appointment.create',
          resourceType: 'appointment',
          resourceId: created.id,
          outcome: 'success',
          requestId: context.requestId,
          metadata: { fields: Object.keys(input).sort() },
        },
        transaction,
      )
      return created
    })
    return toAppointmentDto(appointment)
  } catch (error) {
    mapAppointmentWriteError(error)
  }
}

export async function changeAppointment(
  id: string,
  input: UpdateAppointmentBody,
  context: MutationContext,
): Promise<AppointmentDto> {
  const appointment = await database.client.$transaction(async (transaction) => {
    const existing = await findAppointmentById(id, transaction)
    if (!existing) throw new NotFoundError('Appointment was not found.')

    const updated = await updateAppointmentReason(id, input.reason, transaction)
    await writeAudit(
      {
        actorUserId: context.actorUserId,
        action: 'appointment.update',
        resourceType: 'appointment',
        resourceId: id,
        outcome: 'success',
        requestId: context.requestId,
        metadata: { fields: ['reason'] },
      },
      transaction,
    )
    return updated
  })
  return toAppointmentDto(appointment)
}

export async function cancelAppointment(
  id: string,
  input: CancelAppointmentBody,
  context: MutationContext,
): Promise<AppointmentDto> {
  const appointment = await database.client.$transaction(async (transaction) => {
    const locked = await lockAppointment(id, transaction)
    if (!locked) throw new NotFoundError('Appointment was not found.')
    const existing = await findAppointmentById(id, transaction)
    if (!existing) throw new NotFoundError('Appointment was not found.')
    if (!ACTIVE_STATUSES.has(existing.status)) {
      throw new ConflictError('This appointment cannot be cancelled.')
    }

    const updated = await cancelAppointmentRecord(
      id,
      input.cancellationReason,
      context.actorUserId,
      new Date(),
      transaction,
    )
    await writeAudit(
      {
        actorUserId: context.actorUserId,
        action: 'appointment.cancel',
        resourceType: 'appointment',
        resourceId: id,
        outcome: 'success',
        requestId: context.requestId,
        metadata: { fields: ['status', 'cancellationReason'] },
      },
      transaction,
    )
    return updated
  })
  return toAppointmentDto(appointment)
}

export async function rescheduleAppointment(
  id: string,
  input: RescheduleAppointmentBody,
  context: MutationContext,
): Promise<AppointmentDto> {
  try {
    const replacement = await database.client.$transaction(async (transaction) => {
      const locked = await lockAppointment(id, transaction)
      if (!locked) throw new NotFoundError('Appointment was not found.')
      const original = await findAppointmentById(id, transaction)
      if (!original) throw new NotFoundError('Appointment was not found.')
      if (!ACTIVE_STATUSES.has(original.status)) {
        throw new ConflictError('This appointment cannot be rescheduled.')
      }
      if (original.rescheduledTo) {
        throw new ConflictError('This appointment has already been rescheduled.')
      }
      if (input.patientId && input.patientId !== original.patientId) {
        throw new ConflictError(
          'The replacement appointment must belong to the same patient.',
        )
      }

      await assertNoRescheduleCycle(id, transaction)
      const booking = {
        patientId: original.patientId,
        doctorId: input.doctorId,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        reason: input.reason,
      }
      await assertBookingRules(booking, transaction)

      await cancelAppointmentRecord(
        id,
        RESCHEDULE_CANCELLATION_REASON,
        context.actorUserId,
        new Date(),
        transaction,
      )
      const created = await createAppointmentRecord(
        booking,
        context.actorUserId,
        transaction,
        { rescheduledFromAppointmentId: id },
      )
      await writeAudit(
        {
          actorUserId: context.actorUserId,
          action: 'appointment.reschedule',
          resourceType: 'appointment',
          resourceId: id,
          outcome: 'success',
          requestId: context.requestId,
          metadata: {
            fields: Object.keys(input).sort(),
            replacementId: created.id,
          },
        },
        transaction,
      )
      await writeAudit(
        {
          actorUserId: context.actorUserId,
          action: 'appointment.create',
          resourceType: 'appointment',
          resourceId: created.id,
          outcome: 'success',
          requestId: context.requestId,
          metadata: {
            fields: Object.keys(booking).sort(),
            rescheduledFrom: id,
          },
        },
        transaction,
      )
      return created
    })
    return toAppointmentDto(replacement)
  } catch (error) {
    mapAppointmentWriteError(error)
  }
}

export async function changeAppointmentStatus(
  id: string,
  input: UpdateAppointmentStatusBody,
  context: MutationContext,
): Promise<AppointmentDto> {
  const appointment = await database.client.$transaction(async (transaction) => {
    const locked = await lockAppointment(id, transaction)
    if (!locked) throw new NotFoundError('Appointment was not found.')
    const existing = await findAppointmentById(id, transaction)
    if (!existing) throw new NotFoundError('Appointment was not found.')

    const allowed = STATUS_TRANSITIONS[existing.status] ?? []
    if (!allowed.includes(input.status)) {
      throw new ConflictError('This appointment status transition is not allowed.')
    }

    const updated = await updateAppointmentStatusRecord(
      id,
      input.status,
      transaction,
    )
    await writeAudit(
      {
        actorUserId: context.actorUserId,
        action: 'appointment.status_update',
        resourceType: 'appointment',
        resourceId: id,
        outcome: 'success',
        requestId: context.requestId,
        metadata: { fields: ['status'], from: existing.status, to: input.status },
      },
      transaction,
    )
    return updated
  })
  return toAppointmentDto(appointment)
}

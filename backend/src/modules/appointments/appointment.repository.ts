import { Prisma } from '@prisma/client'
import { database } from '../../database/database.service.js'
import type {
  CreateAppointmentBody,
  ListAppointmentsQuery,
} from './appointment.schemas.js'
import type { AppointmentRecord } from './appointment.types.js'

type AppointmentClient = Pick<
  Prisma.TransactionClient,
  'appointment' | 'patient' | 'doctorProfile' | 'doctorSchedule'
>

function clientOrDefault(client?: AppointmentClient): AppointmentClient {
  return client ?? database.client
}

const appointmentInclude = {
  patient: true,
  doctor: { include: { employee: true } },
  cancelledBy: { select: { id: true, username: true } },
  createdBy: { select: { id: true, username: true } },
  rescheduledFrom: {
    select: { id: true, status: true, startsAt: true, endsAt: true },
  },
  rescheduledTo: {
    select: { id: true, status: true, startsAt: true, endsAt: true },
  },
} as const

function appointmentWhere(
  query: ListAppointmentsQuery,
): Prisma.AppointmentWhereInput {
  return {
    ...(query.patientId ? { patientId: query.patientId } : {}),
    ...(query.doctorId ? { doctorId: query.doctorId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.startsAtFrom || query.startsAtTo
      ? {
          startsAt: {
            ...(query.startsAtFrom
              ? { gte: new Date(query.startsAtFrom) }
              : {}),
            ...(query.startsAtTo ? { lt: new Date(query.startsAtTo) } : {}),
          },
        }
      : {}),
  }
}

export async function listAppointments(query: ListAppointmentsQuery): Promise<{
  appointments: AppointmentRecord[]
  totalItems: number
}> {
  const where = appointmentWhere(query)
  const totalItems = await database.client.appointment.count({ where })
  const offset = (query.page - 1) * query.pageSize
  const appointments =
    offset >= totalItems
      ? []
      : await database.client.appointment.findMany({
          where,
          skip: offset,
          take: query.pageSize,
          include: appointmentInclude,
          orderBy: [{ [query.sortBy]: query.sortOrder }, { id: 'asc' }],
        })
  return { appointments, totalItems }
}

export function findAppointmentById(
  id: string,
  client?: AppointmentClient,
): Promise<AppointmentRecord | null> {
  return clientOrDefault(client).appointment.findUnique({
    where: { id },
    include: appointmentInclude,
  })
}

export function findPatientById(
  id: string,
  client?: AppointmentClient,
) {
  return clientOrDefault(client).patient.findUnique({
    where: { id },
    select: { id: true },
  })
}

export function findDoctorForBooking(
  id: string,
  client?: AppointmentClient,
) {
  return clientOrDefault(client).doctorProfile.findUnique({
    where: { id },
    include: { employee: true },
  })
}

export function createAppointment(
  input: CreateAppointmentBody,
  createdByUserId: string,
  client?: AppointmentClient,
  extras?: {
    rescheduledFromAppointmentId?: string
  },
): Promise<AppointmentRecord> {
  const data: Prisma.AppointmentUncheckedCreateInput = {
    patientId: input.patientId,
    doctorId: input.doctorId,
    startsAt: new Date(input.startsAt),
    endsAt: new Date(input.endsAt),
    status: 'scheduled',
    reason: input.reason ?? null,
    createdByUserId,
  }
  if (extras?.rescheduledFromAppointmentId) {
    data.rescheduledFromAppointmentId = extras.rescheduledFromAppointmentId
  }
  return clientOrDefault(client).appointment.create({
    data,
    include: appointmentInclude,
  })
}

export function updateAppointmentReason(
  id: string,
  reason: string | null,
  client?: AppointmentClient,
): Promise<AppointmentRecord> {
  return clientOrDefault(client).appointment.update({
    where: { id },
    data: { reason, updatedAt: new Date() },
    include: appointmentInclude,
  })
}

export function cancelAppointment(
  id: string,
  cancellationReason: string,
  cancelledByUserId: string,
  cancelledAt: Date,
  client?: AppointmentClient,
): Promise<AppointmentRecord> {
  return clientOrDefault(client).appointment.update({
    where: { id },
    data: {
      status: 'cancelled',
      cancellationReason,
      cancelledAt,
      cancelledByUserId,
      updatedAt: new Date(),
    },
    include: appointmentInclude,
  })
}

export function updateAppointmentStatus(
  id: string,
  status: string,
  client?: AppointmentClient,
): Promise<AppointmentRecord> {
  return clientOrDefault(client).appointment.update({
    where: { id },
    data: { status, updatedAt: new Date() },
    include: appointmentInclude,
  })
}

export async function lockAppointment(
  id: string,
  client: Prisma.TransactionClient,
): Promise<{ id: string } | null> {
  const rows = await client.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "appointments"
    WHERE "id" = ${id}::uuid
    FOR UPDATE
  `
  return rows[0] ?? null
}

export async function lockAvailableSchedule(
  doctorId: string,
  startsAt: Date,
  endsAt: Date,
  client: Prisma.TransactionClient,
): Promise<{ id: string } | null> {
  const rows = await client.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "doctor_schedules"
    WHERE "doctor_id" = ${doctorId}::uuid
      AND "status" = 'available'
      AND "starts_at" <= ${startsAt}
      AND "ends_at" >= ${endsAt}
    ORDER BY "id"
    FOR UPDATE
    LIMIT 1
  `
  return rows[0] ?? null
}

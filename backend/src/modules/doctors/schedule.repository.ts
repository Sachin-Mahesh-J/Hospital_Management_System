import { Prisma, type DoctorSchedule } from '@prisma/client'
import { database } from '../../database/database.service.js'
import type {
  CreateScheduleBody,
  ListSchedulesQuery,
  UpdateScheduleBody,
} from './schedule.schemas.js'

type ScheduleClient = Pick<
  Prisma.TransactionClient,
  'doctorSchedule' | 'doctorProfile'
>

function clientOrDefault(client?: ScheduleClient): ScheduleClient {
  return client ?? database.client
}

function scheduleWhere(
  doctorId: string,
  query: ListSchedulesQuery,
): Prisma.DoctorScheduleWhereInput {
  return {
    doctorId,
    ...(query.status ? { status: query.status } : {}),
  }
}

export async function listSchedules(
  doctorId: string,
  query: ListSchedulesQuery,
): Promise<{
  schedules: DoctorSchedule[]
  totalItems: number
}> {
  const where = scheduleWhere(doctorId, query)
  const totalItems = await database.client.doctorSchedule.count({ where })
  const offset = (query.page - 1) * query.pageSize
  const schedules =
    offset >= totalItems
      ? []
      : await database.client.doctorSchedule.findMany({
          where,
          skip: offset,
          take: query.pageSize,
          orderBy: [{ [query.sortBy]: query.sortOrder }, { id: 'asc' }],
        })
  return { schedules, totalItems }
}

export function findDoctorProfileId(
  id: string,
  client?: ScheduleClient,
) {
  return clientOrDefault(client).doctorProfile.findUnique({
    where: { id },
    select: { id: true },
  })
}

export function findScheduleById(
  id: string,
  client?: ScheduleClient,
): Promise<DoctorSchedule | null> {
  return clientOrDefault(client).doctorSchedule.findUnique({ where: { id } })
}

export function createSchedule(
  doctorId: string,
  input: CreateScheduleBody,
  client?: ScheduleClient,
): Promise<DoctorSchedule> {
  return clientOrDefault(client).doctorSchedule.create({
    data: {
      doctorId,
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      status: input.status ?? 'available',
      note: input.note ?? null,
    },
  })
}

export function updateSchedule(
  id: string,
  input: UpdateScheduleBody,
  client?: ScheduleClient,
): Promise<DoctorSchedule> {
  const data: Prisma.DoctorScheduleUpdateInput = { updatedAt: new Date() }
  if (input.startsAt !== undefined) data.startsAt = new Date(input.startsAt)
  if (input.endsAt !== undefined) data.endsAt = new Date(input.endsAt)
  if (input.status !== undefined) data.status = input.status
  if (input.note !== undefined) data.note = input.note
  return clientOrDefault(client).doctorSchedule.update({ where: { id }, data })
}

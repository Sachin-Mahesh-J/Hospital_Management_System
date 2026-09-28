import { database } from '../../database/database.service.js'
import { isCheckConstraint } from '../../database/prismaErrors.js'
import {
  NotFoundError,
  ValidationError,
} from '../../errors/httpErrors.js'
import { writeAudit } from '../audit/audit.service.js'
import {
  createSchedule as createScheduleRecord,
  findDoctorProfileId,
  findScheduleById,
  listSchedules as listScheduleRecords,
  updateSchedule as updateScheduleRecord,
} from './schedule.repository.js'
import type {
  CreateScheduleBody,
  ListSchedulesQuery,
  UpdateScheduleBody,
} from './schedule.schemas.js'
import { toScheduleDto, type ScheduleDto } from './schedule.types.js'

type MutationContext = {
  actorUserId: string
  requestId: string
}

function mapIntervalError(error: unknown): never {
  if (isCheckConstraint(error)) {
    throw new ValidationError('Schedule end must be after schedule start.', [
      { path: 'endsAt', message: 'Schedule end must be after schedule start.' },
    ])
  }
  throw error
}

async function requireDoctor(
  doctorId: string,
  client?: Parameters<typeof findDoctorProfileId>[1],
): Promise<void> {
  const doctor = await findDoctorProfileId(doctorId, client)
  if (!doctor) throw new NotFoundError('Doctor was not found.')
}

function assertInterval(startsAt: Date, endsAt: Date): void {
  if (endsAt.getTime() <= startsAt.getTime()) {
    throw new ValidationError('Schedule end must be after schedule start.', [
      { path: 'endsAt', message: 'Schedule end must be after schedule start.' },
    ])
  }
}

export async function getDoctorSchedules(
  doctorId: string,
  query: ListSchedulesQuery,
): Promise<{
  data: ScheduleDto[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}> {
  await requireDoctor(doctorId)
  const result = await listScheduleRecords(doctorId, query)
  return {
    data: result.schedules.map(toScheduleDto),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      totalItems: result.totalItems,
      totalPages: Math.ceil(result.totalItems / query.pageSize),
    },
  }
}

export async function registerDoctorSchedule(
  doctorId: string,
  input: CreateScheduleBody,
  context: MutationContext,
): Promise<ScheduleDto> {
  try {
    const schedule = await database.client.$transaction(async (transaction) => {
      await requireDoctor(doctorId, transaction)
      const created = await createScheduleRecord(doctorId, input, transaction)
      await writeAudit(
        {
          actorUserId: context.actorUserId,
          action: 'doctor_schedule.create',
          resourceType: 'doctor_schedule',
          resourceId: created.id,
          outcome: 'success',
          requestId: context.requestId,
          metadata: { fields: Object.keys(input).sort(), doctorId },
        },
        transaction,
      )
      return created
    })
    return toScheduleDto(schedule)
  } catch (error) {
    mapIntervalError(error)
  }
}

export async function changeDoctorSchedule(
  doctorId: string,
  scheduleId: string,
  input: UpdateScheduleBody,
  context: MutationContext,
): Promise<ScheduleDto> {
  try {
    const schedule = await database.client.$transaction(async (transaction) => {
      await requireDoctor(doctorId, transaction)
      const existing = await findScheduleById(scheduleId, transaction)
      if (!existing || existing.doctorId !== doctorId) {
        throw new NotFoundError('Doctor schedule was not found.')
      }

      const startsAt = input.startsAt
        ? new Date(input.startsAt)
        : existing.startsAt
      const endsAt = input.endsAt ? new Date(input.endsAt) : existing.endsAt
      assertInterval(startsAt, endsAt)

      const updated = await updateScheduleRecord(
        scheduleId,
        input,
        transaction,
      )
      const statusChanged =
        input.status !== undefined && input.status !== existing.status
      await writeAudit(
        {
          actorUserId: context.actorUserId,
          action: statusChanged
            ? 'doctor_schedule.status_update'
            : 'doctor_schedule.update',
          resourceType: 'doctor_schedule',
          resourceId: scheduleId,
          outcome: 'success',
          requestId: context.requestId,
          metadata: {
            fields: Object.keys(input).sort(),
            statusChanged,
            doctorId,
          },
        },
        transaction,
      )
      return updated
    })
    return toScheduleDto(schedule)
  } catch (error) {
    mapIntervalError(error)
  }
}

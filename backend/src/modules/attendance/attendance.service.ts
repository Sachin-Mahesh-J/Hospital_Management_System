import { database } from '../../database/database.service.js'
import { isCheckConstraint, isUniqueConstraint } from '../../database/prismaErrors.js'
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../errors/httpErrors.js'
import { writeAudit } from '../audit/audit.service.js'
import {
  createAttendance as createAttendanceRecord,
  findAttendanceById,
  findEmployeeForAttendance,
  listAttendance as listAttendanceRecords,
  updateAttendance as updateAttendanceRecord,
} from './attendance.repository.js'
import type {
  CreateAttendanceBody,
  ListAttendanceQuery,
  UpdateAttendanceBody,
} from './attendance.schemas.js'
import { toAttendanceDto, type AttendanceDto } from './attendance.types.js'

type MutationContext = {
  actorUserId: string
  requestId: string
}

function mapAttendanceWriteError(error: unknown): never {
  if (
    isUniqueConstraint(error, [
      'uq_attendance_records_employee_id_work_date',
      'employee_id',
      'work_date',
    ])
  ) {
    throw new ConflictError(
      'An attendance record already exists for this employee and date.',
    )
  }
  if (isCheckConstraint(error)) {
    throw new ValidationError(
      'Check-out requires check-in and must be later than check-in.',
      [
        {
          path: 'checkOutAt',
          message: 'Check-out requires check-in and must be later than check-in.',
        },
      ],
    )
  }
  throw error
}

export async function getAttendanceRecords(query: ListAttendanceQuery): Promise<{
  data: AttendanceDto[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}> {
  const result = await listAttendanceRecords(query)
  return {
    data: result.records.map(toAttendanceDto),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      totalItems: result.totalItems,
      totalPages: Math.ceil(result.totalItems / query.pageSize),
    },
  }
}

export async function getAttendanceRecord(id: string): Promise<AttendanceDto> {
  const record = await findAttendanceById(id)
  if (!record) throw new NotFoundError('Attendance record was not found.')
  return toAttendanceDto(record)
}

export async function registerAttendance(
  input: CreateAttendanceBody,
  context: MutationContext,
): Promise<AttendanceDto> {
  try {
    const record = await database.client.$transaction(async (transaction) => {
      const employee = await findEmployeeForAttendance(input.employeeId, transaction)
      if (!employee) {
        throw new ValidationError('The referenced employee was not found.', [
          { path: 'employeeId', message: 'Employee does not exist.' },
        ])
      }
      const created = await createAttendanceRecord(
        input,
        context.actorUserId,
        transaction,
      )
      await writeAudit(
        {
          actorUserId: context.actorUserId,
          action: 'attendance.create',
          resourceType: 'attendance',
          resourceId: created.id,
          outcome: 'success',
          requestId: context.requestId,
          metadata: { fields: Object.keys(input).sort() },
        },
        transaction,
      )
      return created
    })
    return toAttendanceDto(record)
  } catch (error) {
    mapAttendanceWriteError(error)
  }
}

export async function changeAttendance(
  id: string,
  input: UpdateAttendanceBody,
  context: MutationContext,
): Promise<AttendanceDto> {
  try {
    const record = await database.client.$transaction(async (transaction) => {
      const existing = await findAttendanceById(id, transaction)
      if (!existing) throw new NotFoundError('Attendance record was not found.')

      const mergedCheckIn =
        input.checkInAt !== undefined
          ? input.checkInAt
          : (existing.checkInAt?.toISOString() ?? null)
      const mergedCheckOut =
        input.checkOutAt !== undefined
          ? input.checkOutAt
          : (existing.checkOutAt?.toISOString() ?? null)
      if (mergedCheckOut && !mergedCheckIn) {
        throw new ValidationError(
          'Check-out requires check-in and must be later than check-in.',
          [
            {
              path: 'checkOutAt',
              message: 'Check-out requires check-in and must be later than check-in.',
            },
          ],
        )
      }

      const updated = await updateAttendanceRecord(id, input, transaction)
      await writeAudit(
        {
          actorUserId: context.actorUserId,
          action: 'attendance.update',
          resourceType: 'attendance',
          resourceId: id,
          outcome: 'success',
          requestId: context.requestId,
          metadata: { fields: Object.keys(input).sort() },
        },
        transaction,
      )
      return updated
    })
    return toAttendanceDto(record)
  } catch (error) {
    mapAttendanceWriteError(error)
  }
}

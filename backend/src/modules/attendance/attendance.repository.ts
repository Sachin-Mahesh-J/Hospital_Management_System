import { Prisma } from '@prisma/client'
import { database } from '../../database/database.service.js'
import type {
  CreateAttendanceBody,
  ListAttendanceQuery,
  UpdateAttendanceBody,
} from './attendance.schemas.js'
import type { AttendanceRecordRow } from './attendance.types.js'

type AttendanceClient = Pick<
  Prisma.TransactionClient,
  'attendanceRecord' | 'employee'
>

function clientOrDefault(client?: AttendanceClient): AttendanceClient {
  return client ?? database.client
}

const attendanceInclude = {
  employee: {
    select: {
      id: true,
      employeeNumber: true,
      firstName: true,
      lastName: true,
      employmentStatus: true,
    },
  },
} as const

function toDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`)
}

function attendanceWhere(query: ListAttendanceQuery): Prisma.AttendanceRecordWhereInput {
  return {
    ...(query.employeeId ? { employeeId: query.employeeId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.workDateFrom || query.workDateTo
      ? {
          workDate: {
            ...(query.workDateFrom ? { gte: toDateOnly(query.workDateFrom) } : {}),
            ...(query.workDateTo ? { lte: toDateOnly(query.workDateTo) } : {}),
          },
        }
      : {}),
  }
}

export async function listAttendance(query: ListAttendanceQuery): Promise<{
  records: AttendanceRecordRow[]
  totalItems: number
}> {
  const where = attendanceWhere(query)
  const totalItems = await database.client.attendanceRecord.count({ where })
  const offset = (query.page - 1) * query.pageSize
  const records =
    offset >= totalItems
      ? []
      : await database.client.attendanceRecord.findMany({
          where,
          skip: offset,
          take: query.pageSize,
          include: attendanceInclude,
          orderBy: [{ [query.sortBy]: query.sortOrder }, { id: 'asc' }],
        })
  return { records, totalItems }
}

export function findAttendanceById(
  id: string,
  client?: AttendanceClient,
): Promise<AttendanceRecordRow | null> {
  return clientOrDefault(client).attendanceRecord.findUnique({
    where: { id },
    include: attendanceInclude,
  })
}

export function findEmployeeForAttendance(
  id: string,
  client?: AttendanceClient,
) {
  return clientOrDefault(client).employee.findUnique({
    where: { id },
    select: { id: true },
  })
}

export function createAttendance(
  input: CreateAttendanceBody,
  recordedByUserId: string,
  client?: AttendanceClient,
): Promise<AttendanceRecordRow> {
  return clientOrDefault(client).attendanceRecord.create({
    data: {
      employeeId: input.employeeId,
      workDate: toDateOnly(input.workDate),
      status: input.status,
      checkInAt: input.checkInAt ? new Date(input.checkInAt) : null,
      checkOutAt: input.checkOutAt ? new Date(input.checkOutAt) : null,
      note: input.note ?? null,
      recordedByUserId,
    },
    include: attendanceInclude,
  })
}

export function updateAttendance(
  id: string,
  input: UpdateAttendanceBody,
  client?: AttendanceClient,
): Promise<AttendanceRecordRow> {
  const data: Prisma.AttendanceRecordUpdateInput = { updatedAt: new Date() }
  if (input.status !== undefined) data.status = input.status
  if (input.checkInAt !== undefined) {
    data.checkInAt = input.checkInAt ? new Date(input.checkInAt) : null
  }
  if (input.checkOutAt !== undefined) {
    data.checkOutAt = input.checkOutAt ? new Date(input.checkOutAt) : null
  }
  if (input.note !== undefined) data.note = input.note
  return clientOrDefault(client).attendanceRecord.update({
    where: { id },
    data,
    include: attendanceInclude,
  })
}

import { Prisma } from '@prisma/client'
import { database } from '../../database/database.service.js'
import type { ListLeaveQuery } from './leave.schemas.js'
import type { LeaveRecordRow } from './leave.types.js'

type LeaveClient = Pick<
  Prisma.TransactionClient,
  'leaveRecord' | 'employee' | 'doctorProfile'
>

function clientOrDefault(client?: LeaveClient): LeaveClient {
  return client ?? database.client
}

const leaveInclude = {
  employee: {
    select: {
      id: true,
      employeeNumber: true,
      firstName: true,
      lastName: true,
      employmentStatus: true,
      userId: true,
    },
  },
  decidedBy: { select: { id: true, username: true } },
} as const

function toDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`)
}

function leaveWhere(
  query: ListLeaveQuery,
  scopedEmployeeId?: string,
): Prisma.LeaveRecordWhereInput {
  return {
    ...(scopedEmployeeId
      ? { employeeId: scopedEmployeeId }
      : query.employeeId
        ? { employeeId: query.employeeId }
        : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.startsOnFrom || query.startsOnTo
      ? {
          startsOn: {
            ...(query.startsOnFrom ? { gte: toDateOnly(query.startsOnFrom) } : {}),
            ...(query.startsOnTo ? { lte: toDateOnly(query.startsOnTo) } : {}),
          },
        }
      : {}),
    ...(query.overlapsFrom || query.overlapsTo
      ? {
          AND: [
            query.overlapsTo
              ? { startsOn: { lte: toDateOnly(query.overlapsTo) } }
              : {},
            query.overlapsFrom
              ? { endsOn: { gte: toDateOnly(query.overlapsFrom) } }
              : {},
          ],
        }
      : {}),
  }
}

export async function listLeave(
  query: ListLeaveQuery,
  scopedEmployeeId?: string,
): Promise<{ records: LeaveRecordRow[]; totalItems: number }> {
  const where = leaveWhere(query, scopedEmployeeId)
  const totalItems = await database.client.leaveRecord.count({ where })
  const offset = (query.page - 1) * query.pageSize
  const records =
    offset >= totalItems
      ? []
      : await database.client.leaveRecord.findMany({
          where,
          skip: offset,
          take: query.pageSize,
          include: leaveInclude,
          orderBy: [{ [query.sortBy]: query.sortOrder }, { id: 'asc' }],
        })
  return { records, totalItems }
}

export function findLeaveById(
  id: string,
  client?: LeaveClient,
): Promise<LeaveRecordRow | null> {
  return clientOrDefault(client).leaveRecord.findUnique({
    where: { id },
    include: leaveInclude,
  })
}

export function findEmployeeByUserId(
  userId: string,
  client?: LeaveClient,
) {
  return clientOrDefault(client).employee.findUnique({
    where: { userId },
    select: { id: true, userId: true, employmentStatus: true },
  })
}

export async function lockEmployee(
  employeeId: string,
  client: Prisma.TransactionClient,
): Promise<{ id: string } | null> {
  const rows = await client.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "employees"
    WHERE "id" = ${employeeId}::uuid
    FOR UPDATE
  `
  return rows[0] ?? null
}

export function createLeave(
  employeeId: string,
  input: {
    leaveType: string
    startsOn: string
    endsOn: string
    reason?: string | null | undefined
  },
  client?: LeaveClient,
): Promise<LeaveRecordRow> {
  return clientOrDefault(client).leaveRecord.create({
    data: {
      employeeId,
      leaveType: input.leaveType,
      startsOn: toDateOnly(input.startsOn),
      endsOn: toDateOnly(input.endsOn),
      reason: input.reason ?? null,
      status: 'pending',
    },
    include: leaveInclude,
  })
}

export function updateLeave(
  id: string,
  input: {
    leaveType?: string | undefined
    startsOn?: string | undefined
    endsOn?: string | undefined
    reason?: string | null | undefined
  },
  client?: LeaveClient,
): Promise<LeaveRecordRow> {
  const data: Prisma.LeaveRecordUpdateInput = { updatedAt: new Date() }
  if (input.leaveType !== undefined) data.leaveType = input.leaveType
  if (input.startsOn !== undefined) data.startsOn = toDateOnly(input.startsOn)
  if (input.endsOn !== undefined) data.endsOn = toDateOnly(input.endsOn)
  if (input.reason !== undefined) data.reason = input.reason
  return clientOrDefault(client).leaveRecord.update({
    where: { id },
    data,
    include: leaveInclude,
  })
}

export function decideLeave(
  id: string,
  status: 'approved' | 'rejected' | 'cancelled',
  decidedByUserId: string | null,
  decidedAt: Date | null,
  decisionNote: string | null,
  client?: LeaveClient,
): Promise<LeaveRecordRow> {
  return clientOrDefault(client).leaveRecord.update({
    where: { id },
    data: {
      status,
      decidedByUserId,
      decidedAt,
      decisionNote,
      updatedAt: new Date(),
    },
    include: leaveInclude,
  })
}

export async function findApprovedLeaveOverlappingDates(
  employeeId: string,
  fromDate: string,
  toDate: string,
  client?: LeaveClient,
): Promise<{ id: string } | null> {
  return clientOrDefault(client).leaveRecord.findFirst({
    where: {
      employeeId,
      status: 'approved',
      startsOn: { lte: toDateOnly(toDate) },
      endsOn: { gte: toDateOnly(fromDate) },
    },
    select: { id: true },
  })
}

export function findDoctorEmployeeId(
  doctorId: string,
  client?: LeaveClient,
) {
  return clientOrDefault(client).doctorProfile.findUnique({
    where: { id: doctorId },
    select: { employeeId: true },
  })
}

export function listApprovedLeaveWindows(
  employeeIds: string[],
  fromDate: string,
  toDate: string,
  client?: LeaveClient,
): Promise<Array<{ employeeId: string; startsOn: Date; endsOn: Date }>> {
  if (employeeIds.length === 0) {
    return Promise.resolve([])
  }
  return clientOrDefault(client).leaveRecord.findMany({
    where: {
      employeeId: { in: employeeIds },
      status: 'approved',
      startsOn: { lte: toDateOnly(toDate) },
      endsOn: { gte: toDateOnly(fromDate) },
    },
    select: { employeeId: true, startsOn: true, endsOn: true },
  })
}

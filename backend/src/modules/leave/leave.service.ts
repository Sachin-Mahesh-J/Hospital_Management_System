import { PERMISSIONS } from '../../auth/auth.constants.js'
import type { CurrentUser } from '../../auth/currentUser.js'
import { calendarDateUtc } from '../../config/hospitalTime.js'
import { database } from '../../database/database.service.js'
import {
  isCheckConstraint,
  isExclusionConstraint,
} from '../../database/prismaErrors.js'
import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../errors/httpErrors.js'
import { writeAudit } from '../audit/audit.service.js'
import {
  createLeave as createLeaveRecord,
  decideLeave as decideLeaveRecord,
  findApprovedLeaveOverlappingDates,
  findEmployeeByUserId,
  findLeaveById,
  listLeave as listLeaveRecords,
  lockEmployee,
  updateLeave as updateLeaveRecord,
} from './leave.repository.js'
import type {
  CreateLeaveBody,
  DecideLeaveBody,
  ListLeaveQuery,
  UpdateLeaveBody,
} from './leave.schemas.js'
import { toLeaveDto, type LeaveDto } from './leave.types.js'

type MutationContext = {
  actor: CurrentUser
  requestId: string
}

function canManageAllLeave(actor: CurrentUser): boolean {
  return actor.permissions.includes(PERMISSIONS.leaveApprove)
}

function mapLeaveWriteError(error: unknown): never {
  if (isExclusionConstraint(error, 'ex_leave_records_employee_active_overlap')) {
    throw new ConflictError(
      'This employee already has overlapping pending or approved leave.',
    )
  }
  if (isCheckConstraint(error)) {
    throw new ValidationError('Leave dates or status are invalid.', [
      { path: 'endsOn', message: 'Leave end date must be on or after the start date.' },
    ])
  }
  throw error
}

async function requireLinkedEmployee(
  userId: string,
  client: Parameters<typeof findEmployeeByUserId>[1],
) {
  const employee = await findEmployeeByUserId(userId, client)
  if (!employee) {
    throw new ValidationError(
      'Leave can only be created for a user linked to an employee record.',
      [{ path: 'employeeId', message: 'No employee is linked to this user.' }],
    )
  }
  return employee
}

function assertOwnLeave(
  actor: CurrentUser,
  employeeUserId: string | null,
): void {
  if (canManageAllLeave(actor)) return
  if (employeeUserId !== actor.id) {
    throw new AuthorizationError()
  }
}

export async function employeeHasApprovedLeaveOverlapping(
  employeeId: string,
  fromDate: string,
  toDate: string,
  client?: Parameters<typeof findApprovedLeaveOverlappingDates>[3],
): Promise<boolean> {
  const overlap = await findApprovedLeaveOverlappingDates(
    employeeId,
    fromDate,
    toDate,
    client,
  )
  return overlap !== null
}

export async function getLeaveRecords(
  query: ListLeaveQuery,
  actor: CurrentUser,
): Promise<{
  data: LeaveDto[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}> {
  const scopedEmployeeId = canManageAllLeave(actor)
    ? undefined
    : (await findEmployeeByUserId(actor.id))?.id
  if (!canManageAllLeave(actor) && !scopedEmployeeId) {
    return {
      data: [],
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems: 0,
        totalPages: 0,
      },
    }
  }
  if (
    !canManageAllLeave(actor) &&
    query.employeeId &&
    query.employeeId !== scopedEmployeeId
  ) {
    throw new AuthorizationError()
  }
  const result = await listLeaveRecords(query, scopedEmployeeId)
  return {
    data: result.records.map(toLeaveDto),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      totalItems: result.totalItems,
      totalPages: Math.ceil(result.totalItems / query.pageSize),
    },
  }
}

export async function getLeaveRecord(
  id: string,
  actor: CurrentUser,
): Promise<LeaveDto> {
  const record = await findLeaveById(id)
  if (!record) throw new NotFoundError('Leave record was not found.')
  assertOwnLeave(actor, record.employee.userId)
  return toLeaveDto(record)
}

export async function registerLeave(
  input: CreateLeaveBody,
  context: MutationContext,
): Promise<LeaveDto> {
  try {
    const record = await database.client.$transaction(async (transaction) => {
      const employee = await requireLinkedEmployee(
        context.actor.id,
        transaction,
      )
      const locked = await lockEmployee(employee.id, transaction)
      if (!locked) {
        throw new ValidationError('The referenced employee was not found.', [
          { path: 'employeeId', message: 'Employee does not exist.' },
        ])
      }
      const created = await createLeaveRecord(employee.id, input, transaction)
      await writeAudit(
        {
          actorUserId: context.actor.id,
          action: 'leave.create',
          resourceType: 'leave',
          resourceId: created.id,
          outcome: 'success',
          requestId: context.requestId,
          metadata: { fields: Object.keys(input).sort() },
        },
        transaction,
      )
      return created
    })
    return toLeaveDto(record)
  } catch (error) {
    mapLeaveWriteError(error)
  }
}

export async function changeLeave(
  id: string,
  input: UpdateLeaveBody,
  context: MutationContext,
): Promise<LeaveDto> {
  try {
    const record = await database.client.$transaction(async (transaction) => {
      const existing = await findLeaveById(id, transaction)
      if (!existing) throw new NotFoundError('Leave record was not found.')
      assertOwnLeave(context.actor, existing.employee.userId)
      if (existing.status !== 'pending') {
        throw new ConflictError('Only pending leave may be edited.')
      }
      const locked = await lockEmployee(existing.employeeId, transaction)
      if (!locked) throw new NotFoundError('Leave record was not found.')

      const startsOn = input.startsOn ?? calendarDateUtc(existing.startsOn)
      const endsOn = input.endsOn ?? calendarDateUtc(existing.endsOn)
      if (endsOn < startsOn) {
        throw new ValidationError(
          'Leave end date must be on or after the start date.',
          [
            {
              path: 'endsOn',
              message: 'Leave end date must be on or after the start date.',
            },
          ],
        )
      }

      const updated = await updateLeaveRecord(id, input, transaction)
      await writeAudit(
        {
          actorUserId: context.actor.id,
          action: 'leave.update',
          resourceType: 'leave',
          resourceId: id,
          outcome: 'success',
          requestId: context.requestId,
          metadata: { fields: Object.keys(input).sort() },
        },
        transaction,
      )
      return updated
    })
    return toLeaveDto(record)
  } catch (error) {
    mapLeaveWriteError(error)
  }
}

export async function approveLeave(
  id: string,
  input: DecideLeaveBody,
  context: MutationContext,
): Promise<LeaveDto> {
  try {
    const record = await database.client.$transaction(async (transaction) => {
      const existing = await findLeaveById(id, transaction)
      if (!existing) throw new NotFoundError('Leave record was not found.')
      if (existing.status !== 'pending') {
        throw new ConflictError('Only pending leave may be approved.')
      }
      const locked = await lockEmployee(existing.employeeId, transaction)
      if (!locked) throw new NotFoundError('Leave record was not found.')
      const updated = await decideLeaveRecord(
        id,
        'approved',
        context.actor.id,
        new Date(),
        input.decisionNote ?? null,
        transaction,
      )
      await writeAudit(
        {
          actorUserId: context.actor.id,
          action: 'leave.approve',
          resourceType: 'leave',
          resourceId: id,
          outcome: 'success',
          requestId: context.requestId,
          metadata: { fields: ['status'] },
        },
        transaction,
      )
      return updated
    })
    return toLeaveDto(record)
  } catch (error) {
    mapLeaveWriteError(error)
  }
}

export async function rejectLeave(
  id: string,
  input: DecideLeaveBody,
  context: MutationContext,
): Promise<LeaveDto> {
  const record = await database.client.$transaction(async (transaction) => {
    const existing = await findLeaveById(id, transaction)
    if (!existing) throw new NotFoundError('Leave record was not found.')
    if (existing.status !== 'pending') {
      throw new ConflictError('Only pending leave may be rejected.')
    }
    const updated = await decideLeaveRecord(
      id,
      'rejected',
      context.actor.id,
      new Date(),
      input.decisionNote ?? null,
      transaction,
    )
    await writeAudit(
      {
        actorUserId: context.actor.id,
        action: 'leave.reject',
        resourceType: 'leave',
        resourceId: id,
        outcome: 'success',
        requestId: context.requestId,
        metadata: { fields: ['status'] },
      },
      transaction,
    )
    return updated
  })
  return toLeaveDto(record)
}

export async function cancelLeave(
  id: string,
  context: MutationContext,
): Promise<LeaveDto> {
  const record = await database.client.$transaction(async (transaction) => {
    const existing = await findLeaveById(id, transaction)
    if (!existing) throw new NotFoundError('Leave record was not found.')
    if (existing.employee.userId !== context.actor.id) {
      throw new AuthorizationError()
    }
    if (existing.status !== 'pending') {
      throw new ConflictError('Only pending leave may be cancelled.')
    }
    const updated = await decideLeaveRecord(
      id,
      'cancelled',
      null,
      null,
      null,
      transaction,
    )
    await writeAudit(
      {
        actorUserId: context.actor.id,
        action: 'leave.cancel',
        resourceType: 'leave',
        resourceId: id,
        outcome: 'success',
        requestId: context.requestId,
        metadata: { fields: ['status'] },
      },
      transaction,
    )
    return updated
  })
  return toLeaveDto(record)
}

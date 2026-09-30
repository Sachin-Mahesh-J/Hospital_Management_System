import { Prisma } from '@prisma/client'
import { hashPassword } from '../../auth/password.service.js'
import { database } from '../../database/database.service.js'
import { isUniqueConstraint } from '../../database/prismaErrors.js'
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../errors/httpErrors.js'
import { writeAudit } from '../audit/audit.service.js'
import {
  countActiveAdministrators,
  createUserWithRole,
  findEmployeeForUserLink,
  findManagedUserById,
  findRoleByCode,
  listUsers as listUserRecords,
  replaceUserRole,
  revokeUserSessions,
  updateManagedUser,
  updateUserPassword,
  updateUserStatus,
} from './user.repository.js'
import type {
  ChangeUserRoleBody,
  CreateUserBody,
  ListUsersQuery,
  ResetUserPasswordBody,
  UpdateUserBody,
} from './user.schemas.js'
import { toManagedUserDto, type ManagedUserDto } from './user.types.js'

type MutationContext = {
  actorUserId: string
  requestId: string
}

function mapUserConflict(error: unknown): never {
  if (isUniqueConstraint(error, ['uq_users_username_ci', 'username'])) {
    throw new ConflictError('A user with this username already exists.')
  }
  if (isUniqueConstraint(error, ['uq_employees_user_id', 'user_id'])) {
    throw new ConflictError('This employee is already linked to a user.')
  }
  throw error
}

async function assertAssignableRole(
  roleCode: string,
  client: Parameters<typeof findRoleByCode>[1],
) {
  const role = await findRoleByCode(roleCode, client)
  if (!role || role.status !== 'active' || !role.isSystem) {
    throw new ValidationError('The requested role is not assignable.', [
      { path: 'roleCode', message: 'Role is invalid.' },
    ])
  }
  return role
}

async function assertLinkableEmployee(
  employeeId: string | null | undefined,
  currentUserId: string | undefined,
  client: Parameters<typeof findEmployeeForUserLink>[1],
): Promise<void> {
  if (!employeeId) return
  const employee = await findEmployeeForUserLink(employeeId, client)
  if (!employee) {
    throw new ValidationError('The referenced employee was not found.', [
      { path: 'employeeId', message: 'Employee does not exist.' },
    ])
  }
  if (employee.userId && employee.userId !== currentUserId) {
    throw new ConflictError('This employee is already linked to a user.')
  }
}

function isAdministrator(user: { roles: Array<{ role: { code: string } }> }): boolean {
  return user.roles.some(({ role }) => role.code === 'administrator')
}

async function assertNotLastActiveAdministrator(
  userId: string,
  client: Parameters<typeof countActiveAdministrators>[0],
): Promise<void> {
  const remaining = await countActiveAdministrators(client, userId)
  if (remaining < 1) {
    throw new ConflictError('The last active Administrator cannot be removed.')
  }
}

export async function getUsers(query: ListUsersQuery): Promise<{
  data: ManagedUserDto[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}> {
  const result = await listUserRecords(query)
  return {
    data: result.users.map(toManagedUserDto),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      totalItems: result.totalItems,
      totalPages: Math.ceil(result.totalItems / query.pageSize),
    },
  }
}

export async function getUser(id: string): Promise<ManagedUserDto> {
  const user = await findManagedUserById(id)
  if (!user) throw new NotFoundError('User was not found.')
  return toManagedUserDto(user)
}

export async function registerUser(
  input: CreateUserBody,
  context: MutationContext,
): Promise<ManagedUserDto> {
  try {
    const user = await database.client.$transaction(async (transaction) => {
      const role = await assertAssignableRole(input.roleCode, transaction)
      await assertLinkableEmployee(input.employeeId, undefined, transaction)
      const passwordHash = await hashPassword(input.password)
      const created = await createUserWithRole(
        {
          username: input.username,
          passwordHash,
          status: input.status ?? 'active',
          roleId: role.id,
          assignedByUserId: context.actorUserId,
          employeeId: input.employeeId,
        },
        transaction,
      )
      await writeAudit(
        {
          actorUserId: context.actorUserId,
          action: 'user.create',
          resourceType: 'user',
          resourceId: created.id,
          outcome: 'success',
          requestId: context.requestId,
          metadata: { fields: ['username', 'roleCode', 'status', 'employeeId'] },
        },
        transaction,
      )
      return created
    })
    return toManagedUserDto(user)
  } catch (error) {
    mapUserConflict(error)
  }
}

export async function changeUser(
  id: string,
  input: UpdateUserBody,
  context: MutationContext,
): Promise<ManagedUserDto> {
  try {
    const user = await database.client.$transaction(async (transaction) => {
      const existing = await findManagedUserById(id, transaction)
      if (!existing) throw new NotFoundError('User was not found.')
      await assertLinkableEmployee(input.employeeId, id, transaction)
      const updated = await updateManagedUser(id, input, transaction)
      await writeAudit(
        {
          actorUserId: context.actorUserId,
          action: 'user.update',
          resourceType: 'user',
          resourceId: id,
          outcome: 'success',
          requestId: context.requestId,
          metadata: { fields: Object.keys(input).sort() },
        },
        transaction,
      )
      return updated
    })
    return toManagedUserDto(user)
  } catch (error) {
    mapUserConflict(error)
  }
}

export async function changeUserRole(
  id: string,
  input: ChangeUserRoleBody,
  context: MutationContext,
): Promise<ManagedUserDto> {
  const user = await database.client.$transaction(async (transaction) => {
    if (id === context.actorUserId) {
      throw new ConflictError('You cannot change your own role.')
    }
    const existing = await findManagedUserById(id, transaction)
    if (!existing) throw new NotFoundError('User was not found.')
    const currentCode = existing.roles[0]?.role.code
    if (currentCode === input.roleCode) {
      return existing
    }
    if (
      isAdministrator(existing) &&
      input.roleCode !== 'administrator' &&
      existing.status === 'active'
    ) {
      await assertNotLastActiveAdministrator(id, transaction)
    }
    const role = await assertAssignableRole(input.roleCode, transaction)
    await replaceUserRole(id, role.id, context.actorUserId, transaction)
    const updated = await findManagedUserById(id, transaction)
    if (!updated) throw new NotFoundError('User was not found.')
    await writeAudit(
      {
        actorUserId: context.actorUserId,
        action: 'user.role.update',
        resourceType: 'user',
        resourceId: id,
        outcome: 'success',
        requestId: context.requestId,
        metadata: { fields: ['roleCode'], from: currentCode, to: input.roleCode },
      },
      transaction,
    )
    return updated
  })
  return toManagedUserDto(user)
}

export async function deactivateUser(
  id: string,
  context: MutationContext,
): Promise<ManagedUserDto> {
  const user = await database.client.$transaction(async (transaction) => {
    if (id === context.actorUserId) {
      throw new ConflictError('You cannot deactivate your own account.')
    }
    const existing = await findManagedUserById(id, transaction)
    if (!existing) throw new NotFoundError('User was not found.')
    if (existing.status === 'disabled') return existing
    if (isAdministrator(existing)) {
      await assertNotLastActiveAdministrator(id, transaction)
    }
    const now = new Date()
    const updated = await updateUserStatus(id, 'disabled', transaction)
    await revokeUserSessions(id, now, 'account_deactivated', transaction)
    await writeAudit(
      {
        actorUserId: context.actorUserId,
        action: 'user.deactivate',
        resourceType: 'user',
        resourceId: id,
        outcome: 'success',
        requestId: context.requestId,
        metadata: { fields: ['status'] },
      },
      transaction,
    )
    return updated
  })
  return toManagedUserDto(user)
}

export async function reactivateUser(
  id: string,
  context: MutationContext,
): Promise<ManagedUserDto> {
  const user = await database.client.$transaction(async (transaction) => {
    const existing = await findManagedUserById(id, transaction)
    if (!existing) throw new NotFoundError('User was not found.')
    if (existing.status === 'active') return existing
    const updated = await updateUserStatus(id, 'active', transaction)
    await writeAudit(
      {
        actorUserId: context.actorUserId,
        action: 'user.reactivate',
        resourceType: 'user',
        resourceId: id,
        outcome: 'success',
        requestId: context.requestId,
        metadata: { fields: ['status'] },
      },
      transaction,
    )
    return updated
  })
  return toManagedUserDto(user)
}

export async function resetUserPassword(
  id: string,
  input: ResetUserPasswordBody,
  context: MutationContext,
): Promise<void> {
  await database.client.$transaction(
    async (transaction) => {
      if (id === context.actorUserId) {
        throw new ConflictError(
          'Use the authenticated password-change endpoint for your own password.',
        )
      }
      const existing = await findManagedUserById(id, transaction)
      if (!existing) throw new NotFoundError('User was not found.')
      const now = new Date()
      const passwordHash = await hashPassword(input.newPassword)
      await updateUserPassword(id, passwordHash, now, transaction)
      await revokeUserSessions(id, now, 'password_reset', transaction)
      await writeAudit(
        {
          actorUserId: context.actorUserId,
          action: 'user.password.reset',
          resourceType: 'user',
          resourceId: id,
          outcome: 'success',
          requestId: context.requestId,
          metadata: { fields: ['password'] },
        },
        transaction,
      )
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  )
}

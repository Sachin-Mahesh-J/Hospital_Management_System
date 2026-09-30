import { Prisma } from '@prisma/client'
import { database } from '../../database/database.service.js'
import { ConflictError, NotFoundError } from '../../errors/httpErrors.js'
import type { ListUsersQuery } from './user.schemas.js'
import type { ManagedUserRecord } from './user.types.js'

type UserClient = Pick<
  Prisma.TransactionClient,
  'user' | 'userRole' | 'role' | 'employee' | 'refreshSession'
>

function clientOrDefault(client?: UserClient): UserClient {
  return client ?? database.client
}

const userInclude = {
  roles: {
    include: { role: { select: { id: true, code: true, name: true } } },
    take: 1,
    orderBy: { assignedAt: 'asc' as const },
  },
  employee: {
    select: {
      id: true,
      employeeNumber: true,
      firstName: true,
      lastName: true,
    },
  },
} as const

function userWhere(query: ListUsersQuery): Prisma.UserWhereInput {
  const search = query.search?.trim()
  return {
    ...(query.status ? { status: query.status } : {}),
    ...(query.roleCode
      ? { roles: { some: { role: { code: query.roleCode } } } }
      : {}),
    ...(search
      ? {
          username: { contains: search, mode: 'insensitive' },
        }
      : {}),
  }
}

export async function listUsers(query: ListUsersQuery): Promise<{
  users: ManagedUserRecord[]
  totalItems: number
}> {
  const where = userWhere(query)
  const totalItems = await database.client.user.count({ where })
  const offset = (query.page - 1) * query.pageSize
  const users =
    offset >= totalItems
      ? []
      : await database.client.user.findMany({
          where,
          skip: offset,
          take: query.pageSize,
          include: userInclude,
          orderBy: [{ [query.sortBy]: query.sortOrder }, { id: 'asc' }],
        })
  return { users, totalItems }
}

export function findManagedUserById(
  id: string,
  client?: UserClient,
): Promise<ManagedUserRecord | null> {
  return clientOrDefault(client).user.findUnique({
    where: { id },
    include: userInclude,
  })
}

export function findRoleByCode(code: string, client?: UserClient) {
  return clientOrDefault(client).role.findUnique({
    where: { code },
    select: { id: true, code: true, name: true, status: true, isSystem: true },
  })
}

export function findEmployeeForUserLink(id: string, client?: UserClient) {
  return clientOrDefault(client).employee.findUnique({
    where: { id },
    select: { id: true, userId: true },
  })
}

export function createUserWithRole(
  input: {
    username: string
    passwordHash: string
    status: string
    roleId: string
    assignedByUserId: string
    employeeId?: string | null | undefined
  },
  client?: UserClient,
): Promise<ManagedUserRecord> {
  return clientOrDefault(client).user.create({
    data: {
      username: input.username,
      passwordHash: input.passwordHash,
      status: input.status,
      roles: {
        create: {
          roleId: input.roleId,
          assignedByUserId: input.assignedByUserId,
        },
      },
      ...(input.employeeId
        ? { employee: { connect: { id: input.employeeId } } }
        : {}),
    },
    include: userInclude,
  })
}

export function updateManagedUser(
  id: string,
  input: { username?: string | undefined; employeeId?: string | null | undefined },
  client?: UserClient,
): Promise<ManagedUserRecord> {
  const data: Prisma.UserUpdateInput = { updatedAt: new Date() }
  if (input.username !== undefined) data.username = input.username
  if (input.employeeId !== undefined) {
    data.employee = input.employeeId
      ? { connect: { id: input.employeeId } }
      : { disconnect: true }
  }
  return clientOrDefault(client).user.update({
    where: { id },
    data,
    include: userInclude,
  })
}

export async function replaceUserRole(
  userId: string,
  roleId: string,
  assignedByUserId: string,
  client: Prisma.TransactionClient,
): Promise<void> {
  const locked = await client.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "users"
    WHERE "id" = ${userId}::uuid
    FOR UPDATE
  `
  if (locked.length !== 1) {
    throw new NotFoundError('User was not found.')
  }

  await client.userRole.deleteMany({ where: { userId } })
  await client.userRole.create({
    data: { userId, roleId, assignedByUserId },
  })

  const assigned = await client.userRole.count({ where: { userId } })
  if (assigned !== 1) {
    throw new ConflictError('A user must have exactly one role.')
  }
}

export function updateUserStatus(
  id: string,
  status: string,
  client?: UserClient,
): Promise<ManagedUserRecord> {
  return clientOrDefault(client).user.update({
    where: { id },
    data: { status, updatedAt: new Date() },
    include: userInclude,
  })
}

export async function countActiveAdministrators(
  client?: UserClient,
  excludingUserId?: string,
): Promise<number> {
  return clientOrDefault(client).user.count({
    where: {
      status: 'active',
      ...(excludingUserId ? { id: { not: excludingUserId } } : {}),
      roles: { some: { role: { code: 'administrator' } } },
    },
  })
}

export function revokeUserSessions(
  userId: string,
  now: Date,
  reason: string,
  client?: UserClient,
) {
  return clientOrDefault(client).refreshSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: now, revokeReason: reason },
  })
}

export function updateUserPassword(
  id: string,
  passwordHash: string,
  passwordChangedAt: Date,
  client?: UserClient,
): Promise<ManagedUserRecord> {
  return clientOrDefault(client).user.update({
    where: { id },
    data: {
      passwordHash,
      passwordChangedAt,
      failedLoginCount: 0,
      lockedUntil: null,
      updatedAt: passwordChangedAt,
    },
    include: userInclude,
  })
}

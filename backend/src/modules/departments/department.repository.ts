import { Prisma, type Department } from '@prisma/client'
import { database } from '../../database/database.service.js'
import type {
  CreateDepartmentBody,
  ListDepartmentsQuery,
  UpdateDepartmentBody,
} from './department.schemas.js'

type DepartmentClient = Pick<Prisma.TransactionClient, 'department'>

function clientOrDefault(client?: DepartmentClient): DepartmentClient {
  return client ?? database.client
}

function departmentWhere(
  query: ListDepartmentsQuery,
): Prisma.DepartmentWhereInput {
  const search = query.search?.trim()
  return {
    ...(query.status ? { status: query.status } : {}),
    ...(search
      ? {
          OR: [
            { code: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  }
}

export async function listDepartments(query: ListDepartmentsQuery): Promise<{
  departments: Department[]
  totalItems: number
}> {
  const where = departmentWhere(query)
  const totalItems = await database.client.department.count({ where })
  const offset = (query.page - 1) * query.pageSize
  const departments =
    offset >= totalItems
      ? []
      : await database.client.department.findMany({
          where,
          skip: offset,
          take: query.pageSize,
          orderBy: [{ [query.sortBy]: query.sortOrder }, { id: 'asc' }],
        })
  return { departments, totalItems }
}

export function findDepartmentById(
  id: string,
  client?: DepartmentClient,
): Promise<Department | null> {
  return clientOrDefault(client).department.findUnique({ where: { id } })
}

export function createDepartment(
  input: CreateDepartmentBody,
  client?: DepartmentClient,
): Promise<Department> {
  return clientOrDefault(client).department.create({
    data: {
      code: input.code,
      name: input.name,
      description: input.description ?? null,
      status: input.status ?? 'active',
    },
  })
}

export function updateDepartment(
  id: string,
  input: UpdateDepartmentBody,
  client?: DepartmentClient,
): Promise<Department> {
  const data: Prisma.DepartmentUpdateInput = { updatedAt: new Date() }
  if (input.code !== undefined) data.code = input.code
  if (input.name !== undefined) data.name = input.name
  if (input.description !== undefined) data.description = input.description
  if (input.status !== undefined) data.status = input.status
  return clientOrDefault(client).department.update({ where: { id }, data })
}

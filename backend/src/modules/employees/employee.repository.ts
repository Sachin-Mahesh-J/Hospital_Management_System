import { Prisma } from '@prisma/client'
import { database } from '../../database/database.service.js'
import type {
  CreateEmployeeBody,
  ListEmployeesQuery,
  UpdateEmployeeBody,
} from './employee.schemas.js'
import type { EmployeeRecord } from './employee.types.js'

type EmployeeClient = Pick<
  Prisma.TransactionClient,
  'employee' | 'department' | 'user'
>

function clientOrDefault(client?: EmployeeClient): EmployeeClient {
  return client ?? database.client
}

const employeeInclude = { department: true } as const

function employeeWhere(query: ListEmployeesQuery): Prisma.EmployeeWhereInput {
  const search = query.search?.trim()
  return {
    ...(query.departmentId ? { departmentId: query.departmentId } : {}),
    ...(query.employmentStatus
      ? { employmentStatus: query.employmentStatus }
      : {}),
    ...(query.hasDoctorProfile === 'true'
      ? { doctorProfile: { isNot: null } }
      : {}),
    ...(query.hasDoctorProfile === 'false'
      ? { doctorProfile: { is: null } }
      : {}),
    ...(search
      ? {
          OR: [
            { employeeNumber: { contains: search, mode: 'insensitive' } },
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  }
}

export async function listEmployees(query: ListEmployeesQuery): Promise<{
  employees: EmployeeRecord[]
  totalItems: number
}> {
  const where = employeeWhere(query)
  const totalItems = await database.client.employee.count({ where })
  const offset = (query.page - 1) * query.pageSize
  const employees =
    offset >= totalItems
      ? []
      : await database.client.employee.findMany({
          where,
          skip: offset,
          take: query.pageSize,
          include: employeeInclude,
          orderBy: [{ [query.sortBy]: query.sortOrder }, { id: 'asc' }],
        })
  return { employees, totalItems }
}

export function findEmployeeById(
  id: string,
  client?: EmployeeClient,
): Promise<EmployeeRecord | null> {
  return clientOrDefault(client).employee.findUnique({
    where: { id },
    include: employeeInclude,
  })
}

export function findDepartmentForAssignment(
  id: string,
  client?: EmployeeClient,
) {
  return clientOrDefault(client).department.findUnique({ where: { id } })
}

export function findUserForLink(id: string, client?: EmployeeClient) {
  return clientOrDefault(client).user.findUnique({
    where: { id },
    select: { id: true },
  })
}

function toDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`)
}

export function createEmployee(
  employeeNumber: string,
  input: CreateEmployeeBody,
  client?: EmployeeClient,
): Promise<EmployeeRecord> {
  return clientOrDefault(client).employee.create({
    data: {
      employeeNumber,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone ?? null,
      email: input.email ?? null,
      jobTitle: input.jobTitle,
      departmentId: input.departmentId,
      userId: input.userId ?? null,
      employmentStatus: input.employmentStatus ?? 'active',
      hireDate: toDateOnly(input.hireDate),
      endDate: input.endDate ? toDateOnly(input.endDate) : null,
    },
    include: employeeInclude,
  })
}

export function updateEmployee(
  id: string,
  input: UpdateEmployeeBody,
  client?: EmployeeClient,
): Promise<EmployeeRecord> {
  const data: Prisma.EmployeeUpdateInput = { updatedAt: new Date() }
  if (input.firstName !== undefined) data.firstName = input.firstName
  if (input.lastName !== undefined) data.lastName = input.lastName
  if (input.phone !== undefined) data.phone = input.phone
  if (input.email !== undefined) data.email = input.email
  if (input.jobTitle !== undefined) data.jobTitle = input.jobTitle
  if (input.departmentId !== undefined) {
    data.department = { connect: { id: input.departmentId } }
  }
  if (input.userId !== undefined) {
    data.user = input.userId
      ? { connect: { id: input.userId } }
      : { disconnect: true }
  }
  if (input.employmentStatus !== undefined) {
    data.employmentStatus = input.employmentStatus
  }
  if (input.hireDate !== undefined) data.hireDate = toDateOnly(input.hireDate)
  if (input.endDate !== undefined) {
    data.endDate = input.endDate ? toDateOnly(input.endDate) : null
  }
  return clientOrDefault(client).employee.update({
    where: { id },
    data,
    include: employeeInclude,
  })
}

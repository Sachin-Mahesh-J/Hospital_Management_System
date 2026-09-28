import { randomUUID } from 'node:crypto'
import { database } from '../../database/database.service.js'
import { isUniqueConstraint } from '../../database/prismaErrors.js'
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../errors/httpErrors.js'
import { writeAudit } from '../audit/audit.service.js'
import {
  createEmployee as createEmployeeRecord,
  findDepartmentForAssignment,
  findEmployeeById,
  findUserForLink,
  listEmployees as listEmployeeRecords,
  updateEmployee as updateEmployeeRecord,
} from './employee.repository.js'
import type {
  CreateEmployeeBody,
  ListEmployeesQuery,
  UpdateEmployeeBody,
} from './employee.schemas.js'
import { toEmployeeDto, type EmployeeDto } from './employee.types.js'

type MutationContext = {
  actorUserId: string
  requestId: string
}

function generatedEmployeeNumber(): string {
  return `E-${randomUUID()}`
}

function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10)
}

function mapEmployeeConflict(error: unknown): never {
  if (
    isUniqueConstraint(error, [
      'uq_employees_employee_number',
      'employee_number',
    ])
  ) {
    throw error
  }
  if (isUniqueConstraint(error, ['uq_employees_user_id', 'user_id'])) {
    throw new ConflictError('This user is already linked to an employee.')
  }
  throw error
}

function isEmployeeNumberCollision(error: unknown): boolean {
  return isUniqueConstraint(error, [
    'uq_employees_employee_number',
    'employee_number',
  ])
}

async function assertAssignableDepartment(
  departmentId: string,
  client: Parameters<typeof findDepartmentForAssignment>[1],
): Promise<void> {
  const department = await findDepartmentForAssignment(departmentId, client)
  if (!department) {
    throw new ValidationError('The referenced department was not found.', [
      { path: 'departmentId', message: 'Department does not exist.' },
    ])
  }
  if (department.status !== 'active') {
    throw new ValidationError(
      'Employees can only be assigned to an active department.',
      [{ path: 'departmentId', message: 'Department is not active.' }],
    )
  }
}

async function assertLinkableUser(
  userId: string | null | undefined,
  client: Parameters<typeof findUserForLink>[1],
): Promise<void> {
  if (!userId) return
  const user = await findUserForLink(userId, client)
  if (!user) {
    throw new ValidationError('The referenced user was not found.', [
      { path: 'userId', message: 'User does not exist.' },
    ])
  }
}

function assertMergedEmploymentDates(
  hireDate: string,
  endDate: string | null,
): void {
  if (endDate && endDate < hireDate) {
    throw new ValidationError('End date cannot be earlier than hire date.', [
      { path: 'endDate', message: 'End date cannot be earlier than hire date.' },
    ])
  }
}

export async function getEmployees(query: ListEmployeesQuery): Promise<{
  data: EmployeeDto[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}> {
  const result = await listEmployeeRecords(query)
  return {
    data: result.employees.map(toEmployeeDto),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      totalItems: result.totalItems,
      totalPages: Math.ceil(result.totalItems / query.pageSize),
    },
  }
}

export async function getEmployee(id: string): Promise<EmployeeDto> {
  const employee = await findEmployeeById(id)
  if (!employee) throw new NotFoundError('Employee was not found.')
  return toEmployeeDto(employee)
}

export async function registerEmployee(
  input: CreateEmployeeBody,
  context: MutationContext,
): Promise<EmployeeDto> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const employee = await database.client.$transaction(async (transaction) => {
        await assertAssignableDepartment(input.departmentId, transaction)
        await assertLinkableUser(input.userId, transaction)
        const created = await createEmployeeRecord(
          generatedEmployeeNumber(),
          input,
          transaction,
        )
        await writeAudit(
          {
            actorUserId: context.actorUserId,
            action: 'employee.create',
            resourceType: 'employee',
            resourceId: created.id,
            outcome: 'success',
            requestId: context.requestId,
            metadata: { fields: Object.keys(input).sort() },
          },
          transaction,
        )
        return created
      })
      return toEmployeeDto(employee)
    } catch (error) {
      if (isEmployeeNumberCollision(error)) continue
      mapEmployeeConflict(error)
    }
  }
  throw new ConflictError('A unique employee number could not be allocated.')
}

export async function changeEmployee(
  id: string,
  input: UpdateEmployeeBody,
  context: MutationContext,
): Promise<EmployeeDto> {
  try {
    const employee = await database.client.$transaction(async (transaction) => {
      const existing = await findEmployeeById(id, transaction)
      if (!existing) throw new NotFoundError('Employee was not found.')

      if (input.departmentId !== undefined) {
        await assertAssignableDepartment(input.departmentId, transaction)
      }
      if (input.userId !== undefined) {
        await assertLinkableUser(input.userId, transaction)
      }

      const hireDate = input.hireDate ?? dateOnly(existing.hireDate)
      const endDate =
        input.endDate !== undefined
          ? input.endDate
          : existing.endDate
            ? dateOnly(existing.endDate)
            : null
      assertMergedEmploymentDates(hireDate, endDate)

      const updated = await updateEmployeeRecord(id, input, transaction)
      const statusChanged =
        input.employmentStatus !== undefined &&
        input.employmentStatus !== existing.employmentStatus
      const departmentChanged =
        input.departmentId !== undefined &&
        input.departmentId !== existing.departmentId
      const action = statusChanged
        ? 'employee.status_update'
        : departmentChanged
          ? 'employee.department_change'
          : 'employee.update'
      await writeAudit(
        {
          actorUserId: context.actorUserId,
          action,
          resourceType: 'employee',
          resourceId: id,
          outcome: 'success',
          requestId: context.requestId,
          metadata: {
            fields: Object.keys(input).sort(),
            statusChanged,
            departmentChanged,
          },
        },
        transaction,
      )
      return updated
    })
    return toEmployeeDto(employee)
  } catch (error) {
    mapEmployeeConflict(error)
  }
}

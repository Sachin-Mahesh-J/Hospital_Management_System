import { database } from '../../database/database.service.js'
import { isUniqueConstraint } from '../../database/prismaErrors.js'
import { ConflictError, NotFoundError } from '../../errors/httpErrors.js'
import { writeAudit } from '../audit/audit.service.js'
import {
  createDepartment as createDepartmentRecord,
  findDepartmentById,
  listDepartments as listDepartmentRecords,
  updateDepartment as updateDepartmentRecord,
} from './department.repository.js'
import type {
  CreateDepartmentBody,
  ListDepartmentsQuery,
  UpdateDepartmentBody,
} from './department.schemas.js'
import { toDepartmentDto, type DepartmentDto } from './department.types.js'

type MutationContext = {
  actorUserId: string
  requestId: string
}

function mapDepartmentConflict(error: unknown): never {
  if (isUniqueConstraint(error, ['uq_departments_code', 'code'])) {
    throw new ConflictError('A department with this code already exists.')
  }
  if (isUniqueConstraint(error, ['uq_departments_name', 'name'])) {
    throw new ConflictError('A department with this name already exists.')
  }
  throw error
}

export async function getDepartments(query: ListDepartmentsQuery): Promise<{
  data: DepartmentDto[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}> {
  const result = await listDepartmentRecords(query)
  return {
    data: result.departments.map(toDepartmentDto),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      totalItems: result.totalItems,
      totalPages: Math.ceil(result.totalItems / query.pageSize),
    },
  }
}

export async function getDepartment(id: string): Promise<DepartmentDto> {
  const department = await findDepartmentById(id)
  if (!department) throw new NotFoundError('Department was not found.')
  return toDepartmentDto(department)
}

export async function registerDepartment(
  input: CreateDepartmentBody,
  context: MutationContext,
): Promise<DepartmentDto> {
  try {
    const department = await database.client.$transaction(async (transaction) => {
      const created = await createDepartmentRecord(input, transaction)
      await writeAudit(
        {
          actorUserId: context.actorUserId,
          action: 'department.create',
          resourceType: 'department',
          resourceId: created.id,
          outcome: 'success',
          requestId: context.requestId,
          metadata: { fields: Object.keys(input).sort() },
        },
        transaction,
      )
      return created
    })
    return toDepartmentDto(department)
  } catch (error) {
    mapDepartmentConflict(error)
  }
}

export async function changeDepartment(
  id: string,
  input: UpdateDepartmentBody,
  context: MutationContext,
): Promise<DepartmentDto> {
  try {
    const department = await database.client.$transaction(async (transaction) => {
      const existing = await findDepartmentById(id, transaction)
      if (!existing) throw new NotFoundError('Department was not found.')

      const updated = await updateDepartmentRecord(id, input, transaction)
      const statusChanged =
        input.status !== undefined && input.status !== existing.status
      await writeAudit(
        {
          actorUserId: context.actorUserId,
          action: statusChanged
            ? 'department.status_update'
            : 'department.update',
          resourceType: 'department',
          resourceId: id,
          outcome: 'success',
          requestId: context.requestId,
          metadata: { fields: Object.keys(input).sort(), statusChanged },
        },
        transaction,
      )
      return updated
    })
    return toDepartmentDto(department)
  } catch (error) {
    mapDepartmentConflict(error)
  }
}

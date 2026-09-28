import type { Department } from '@prisma/client'

export type DepartmentDto = {
  id: string
  code: string
  name: string
  description: string | null
  status: string
  createdAt: string
  updatedAt: string
}

export function toDepartmentDto(department: Department): DepartmentDto {
  return {
    id: department.id,
    code: department.code,
    name: department.name,
    description: department.description,
    status: department.status,
    createdAt: department.createdAt.toISOString(),
    updatedAt: department.updatedAt.toISOString(),
  }
}

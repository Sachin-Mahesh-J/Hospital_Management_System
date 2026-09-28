import type { Department, Employee } from '@prisma/client'
import { toDepartmentDto, type DepartmentDto } from '../departments/department.types.js'

export type EmployeeRecord = Employee & { department: Department }

export type EmployeeDto = {
  id: string
  employeeNumber: string
  userId: string | null
  departmentId: string
  department: DepartmentDto
  firstName: string
  lastName: string
  phone: string | null
  email: string | null
  jobTitle: string
  employmentStatus: string
  hireDate: string
  endDate: string | null
  createdAt: string
  updatedAt: string
}

function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10)
}

export function toEmployeeDto(employee: EmployeeRecord): EmployeeDto {
  return {
    id: employee.id,
    employeeNumber: employee.employeeNumber,
    userId: employee.userId,
    departmentId: employee.departmentId,
    department: toDepartmentDto(employee.department),
    firstName: employee.firstName,
    lastName: employee.lastName,
    phone: employee.phone,
    email: employee.email,
    jobTitle: employee.jobTitle,
    employmentStatus: employee.employmentStatus,
    hireDate: dateOnly(employee.hireDate),
    endDate: employee.endDate ? dateOnly(employee.endDate) : null,
    createdAt: employee.createdAt.toISOString(),
    updatedAt: employee.updatedAt.toISOString(),
  }
}

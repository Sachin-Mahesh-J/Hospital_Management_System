import type { Department } from '../departments/types'

export const employmentStatuses = ['active', 'inactive', 'terminated'] as const

export type EmploymentStatus = (typeof employmentStatuses)[number]

export type Employee = {
  id: string
  employeeNumber: string
  userId: string | null
  departmentId: string
  department: Department
  firstName: string
  lastName: string
  phone: string | null
  email: string | null
  jobTitle: string
  employmentStatus: EmploymentStatus
  hireDate: string
  endDate: string | null
  createdAt: string
  updatedAt: string
}

export type EmployeeInput = {
  firstName: string
  lastName: string
  phone?: string | null
  email?: string | null
  jobTitle: string
  departmentId: string
  userId?: string | null
  employmentStatus?: EmploymentStatus
  hireDate: string
  endDate?: string | null
}

export type EmployeeUpdate = Partial<EmployeeInput>

export type EmployeeFilters = {
  page: number
  pageSize: number
  search?: string
  departmentId?: string
  employmentStatus?: EmploymentStatus
  hasDoctorProfile?: 'true' | 'false'
  sortBy?: 'employeeNumber' | 'firstName' | 'lastName' | 'hireDate' | 'employmentStatus' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

export type EmployeeListResult = {
  data: Employee[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}

import type { Employee } from '../employees/types'

export const doctorStatuses = ['active', 'inactive'] as const

export type DoctorStatus = (typeof doctorStatuses)[number]

export type Doctor = {
  id: string
  employeeId: string
  employee: Employee
  licenseNumber: string
  specialization: string
  professionalSummary: string | null
  contactExtension: string | null
  status: DoctorStatus
  createdAt: string
  updatedAt: string
}

export type DoctorInput = {
  employeeId: string
  licenseNumber: string
  specialization: string
  professionalSummary?: string | null
  contactExtension?: string | null
  status?: DoctorStatus
}

export type DoctorUpdate = Omit<Partial<DoctorInput>, 'employeeId'>

export type DoctorFilters = {
  page: number
  pageSize: number
  search?: string
  status?: DoctorStatus
  departmentId?: string
  employmentStatus?: 'active' | 'inactive' | 'terminated'
  sortBy?: 'licenseNumber' | 'specialization' | 'status' | 'createdAt' | 'lastName' | 'firstName'
  sortOrder?: 'asc' | 'desc'
}

export type DoctorListResult = {
  data: Doctor[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}

export const departmentStatuses = ['active', 'inactive'] as const

export type DepartmentStatus = (typeof departmentStatuses)[number]

export type Department = {
  id: string
  code: string
  name: string
  description: string | null
  status: DepartmentStatus
  createdAt: string
  updatedAt: string
}

export type DepartmentInput = {
  code: string
  name: string
  description?: string | null
  status?: DepartmentStatus
}

export type DepartmentUpdate = Partial<DepartmentInput>

export type DepartmentFilters = {
  page: number
  pageSize: number
  search?: string
  status?: DepartmentStatus
  sortBy?: 'code' | 'name' | 'status' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

export type DepartmentListResult = {
  data: Department[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}

export const userStatuses = ['active', 'disabled'] as const
export type UserStatus = (typeof userStatuses)[number]

export const systemRoleCodes = [
  'administrator',
  'doctor',
  'nurse',
  'receptionist',
  'laboratory_staff',
  'pharmacist',
  'accountant',
] as const
export type SystemRoleCode = (typeof systemRoleCodes)[number]

export type ManagedUser = {
  id: string
  username: string
  status: string
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
  role: {
    id: string
    code: string
    name: string
  }
  employee: {
    id: string
    employeeNumber: string
    firstName: string
    lastName: string
  } | null
}

export type CreateUserInput = {
  username: string
  password: string
  roleCode: SystemRoleCode
  status?: UserStatus
  employeeId?: string | null
}

export type UpdateUserInput = {
  username?: string
  employeeId?: string | null
}

export type UserFilters = {
  page: number
  pageSize: number
  search?: string
  status?: UserStatus
  roleCode?: SystemRoleCode
}

export type UserListResult = {
  data: ManagedUser[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}

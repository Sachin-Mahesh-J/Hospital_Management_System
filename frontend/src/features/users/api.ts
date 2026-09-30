import { apiClient } from '../../api/client'
import type {
  CreateUserInput,
  ManagedUser,
  UpdateUserInput,
  UserFilters,
  UserListResult,
} from './types'

type PaginatedResponse = {
  data: ManagedUser[]
  meta: { pagination: UserListResult['pagination'] }
}

function queryString(filters: UserFilters): string {
  const params = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize),
  })
  if (filters.search) params.set('search', filters.search)
  if (filters.status) params.set('status', filters.status)
  if (filters.roleCode) params.set('roleCode', filters.roleCode)
  return params.toString()
}

export async function fetchUsers(filters: UserFilters): Promise<UserListResult> {
  const response = await apiClient.getEnvelope<ManagedUser[]>(
    `/users?${queryString(filters)}`,
  ) as PaginatedResponse
  return { data: response.data, pagination: response.meta.pagination }
}

export function createUser(input: CreateUserInput): Promise<ManagedUser> {
  return apiClient.post<ManagedUser>('/users', input)
}

export function updateUser(id: string, input: UpdateUserInput): Promise<ManagedUser> {
  return apiClient.patch<ManagedUser>(`/users/${encodeURIComponent(id)}`, input)
}

export function changeUserRole(id: string, roleCode: string): Promise<ManagedUser> {
  return apiClient.post<ManagedUser>(`/users/${encodeURIComponent(id)}/role`, { roleCode })
}

export function deactivateUser(id: string): Promise<ManagedUser> {
  return apiClient.post<ManagedUser>(`/users/${encodeURIComponent(id)}/deactivate`)
}

export function reactivateUser(id: string): Promise<ManagedUser> {
  return apiClient.post<ManagedUser>(`/users/${encodeURIComponent(id)}/reactivate`)
}

export function resetUserPassword(id: string, newPassword: string): Promise<void> {
  return apiClient.post<void>(`/users/${encodeURIComponent(id)}/password-reset`, {
    newPassword,
  })
}

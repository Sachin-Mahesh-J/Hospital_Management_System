import { apiClient } from '../../api/client'
import type {
  Department,
  DepartmentFilters,
  DepartmentInput,
  DepartmentListResult,
  DepartmentUpdate,
} from './types'

type PaginatedResponse = {
  data: Department[]
  meta: { pagination: DepartmentListResult['pagination'] }
}

function queryString(filters: DepartmentFilters): string {
  const params = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize),
  })
  if (filters.search) params.set('search', filters.search)
  if (filters.status) params.set('status', filters.status)
  if (filters.sortBy) params.set('sortBy', filters.sortBy)
  if (filters.sortOrder) params.set('sortOrder', filters.sortOrder)
  return params.toString()
}

export async function fetchDepartments(
  filters: DepartmentFilters,
): Promise<DepartmentListResult> {
  const response = await apiClient.getEnvelope<Department[]>(
    `/departments?${queryString(filters)}`,
  ) as PaginatedResponse
  return { data: response.data, pagination: response.meta.pagination }
}

export function fetchDepartment(id: string): Promise<Department> {
  return apiClient.get<Department>(`/departments/${encodeURIComponent(id)}`)
}

export function createDepartment(input: DepartmentInput): Promise<Department> {
  return apiClient.post<Department>('/departments', input)
}

export function updateDepartment(
  id: string,
  input: DepartmentUpdate,
): Promise<Department> {
  return apiClient.patch<Department>(
    `/departments/${encodeURIComponent(id)}`,
    input,
  )
}

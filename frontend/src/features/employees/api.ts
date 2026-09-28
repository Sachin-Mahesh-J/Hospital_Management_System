import { apiClient } from '../../api/client'
import type {
  Employee,
  EmployeeFilters,
  EmployeeInput,
  EmployeeListResult,
  EmployeeUpdate,
} from './types'

type PaginatedResponse = {
  data: Employee[]
  meta: { pagination: EmployeeListResult['pagination'] }
}

function queryString(filters: EmployeeFilters): string {
  const params = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize),
  })
  if (filters.search) params.set('search', filters.search)
  if (filters.departmentId) params.set('departmentId', filters.departmentId)
  if (filters.employmentStatus) params.set('employmentStatus', filters.employmentStatus)
  if (filters.hasDoctorProfile) params.set('hasDoctorProfile', filters.hasDoctorProfile)
  if (filters.sortBy) params.set('sortBy', filters.sortBy)
  if (filters.sortOrder) params.set('sortOrder', filters.sortOrder)
  return params.toString()
}

export async function fetchEmployees(
  filters: EmployeeFilters,
): Promise<EmployeeListResult> {
  const response = await apiClient.getEnvelope<Employee[]>(
    `/employees?${queryString(filters)}`,
  ) as PaginatedResponse
  return { data: response.data, pagination: response.meta.pagination }
}

export function fetchEmployee(id: string): Promise<Employee> {
  return apiClient.get<Employee>(`/employees/${encodeURIComponent(id)}`)
}

export function createEmployee(input: EmployeeInput): Promise<Employee> {
  return apiClient.post<Employee>('/employees', input)
}

export function updateEmployee(
  id: string,
  input: EmployeeUpdate,
): Promise<Employee> {
  return apiClient.patch<Employee>(
    `/employees/${encodeURIComponent(id)}`,
    input,
  )
}

import { apiClient } from '../../api/client'
import type {
  Doctor,
  DoctorFilters,
  DoctorInput,
  DoctorListResult,
  DoctorUpdate,
} from './types'

type PaginatedResponse = {
  data: Doctor[]
  meta: { pagination: DoctorListResult['pagination'] }
}

function queryString(filters: DoctorFilters): string {
  const params = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize),
  })
  if (filters.search) params.set('search', filters.search)
  if (filters.status) params.set('status', filters.status)
  if (filters.departmentId) params.set('departmentId', filters.departmentId)
  if (filters.employmentStatus) params.set('employmentStatus', filters.employmentStatus)
  if (filters.sortBy) params.set('sortBy', filters.sortBy)
  if (filters.sortOrder) params.set('sortOrder', filters.sortOrder)
  return params.toString()
}

export async function fetchDoctors(
  filters: DoctorFilters,
): Promise<DoctorListResult> {
  const response = await apiClient.getEnvelope<Doctor[]>(
    `/doctors?${queryString(filters)}`,
  ) as PaginatedResponse
  return { data: response.data, pagination: response.meta.pagination }
}

export function fetchDoctor(id: string): Promise<Doctor> {
  return apiClient.get<Doctor>(`/doctors/${encodeURIComponent(id)}`)
}

export function createDoctor(input: DoctorInput): Promise<Doctor> {
  return apiClient.post<Doctor>('/doctors', input)
}

export function updateDoctor(id: string, input: DoctorUpdate): Promise<Doctor> {
  return apiClient.patch<Doctor>(`/doctors/${encodeURIComponent(id)}`, input)
}

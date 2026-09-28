import { apiClient } from '../../api/client'
import type {
  Admission,
  AdmissionFilters,
  AdmissionInput,
  AdmissionListResult,
} from './types'

type PaginatedResponse = {
  data: Admission[]
  meta: { pagination: AdmissionListResult['pagination'] }
}

function queryString(filters: AdmissionFilters): string {
  const params = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize),
  })
  if (filters.patientId) params.set('patientId', filters.patientId)
  if (filters.attendingDoctorId) params.set('attendingDoctorId', filters.attendingDoctorId)
  if (filters.status) params.set('status', filters.status)
  if (filters.sortBy) params.set('sortBy', filters.sortBy)
  if (filters.sortOrder) params.set('sortOrder', filters.sortOrder)
  return params.toString()
}

export async function fetchAdmissions(
  filters: AdmissionFilters,
): Promise<AdmissionListResult> {
  const response = await apiClient.getEnvelope<Admission[]>(
    `/admissions?${queryString(filters)}`,
  ) as PaginatedResponse
  return { data: response.data, pagination: response.meta.pagination }
}

export function fetchAdmission(id: string): Promise<Admission> {
  return apiClient.get<Admission>(`/admissions/${encodeURIComponent(id)}`)
}

export function createAdmission(input: AdmissionInput): Promise<Admission> {
  return apiClient.post<Admission>('/admissions', input)
}

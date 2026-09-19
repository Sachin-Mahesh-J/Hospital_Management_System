import { apiClient } from '../../api/client'
import type {
  Patient,
  PatientFilters,
  PatientInput,
  PatientListResult,
  PatientUpdate,
} from './types'

type PaginatedResponse = {
  data: Patient[]
  meta: { pagination: PatientListResult['pagination'] }
}

function queryString(filters: PatientFilters): string {
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

export async function fetchPatients(
  filters: PatientFilters,
): Promise<PatientListResult> {
  const response = await apiClient.getEnvelope<Patient[]>(
    `/patients?${queryString(filters)}`,
  ) as PaginatedResponse
  return { data: response.data, pagination: response.meta.pagination }
}

export function fetchPatient(id: string): Promise<Patient> {
  return apiClient.get<Patient>(`/patients/${encodeURIComponent(id)}`)
}

export function createPatient(input: PatientInput): Promise<Patient> {
  return apiClient.post<Patient>('/patients', input)
}

export function updatePatient(
  id: string,
  input: PatientUpdate,
): Promise<Patient> {
  return apiClient.patch<Patient>(
    `/patients/${encodeURIComponent(id)}`,
    input,
  )
}

import { apiClient } from '../../api/client'
import type {
  MedicalRecord,
  MedicalRecordAmendment,
  MedicalRecordFilters,
  MedicalRecordInput,
  MedicalRecordListItem,
  MedicalRecordListResult,
  MedicalRecordUpdate,
} from './types'

type PaginatedResponse = {
  data: MedicalRecordListItem[]
  meta: { pagination: MedicalRecordListResult['pagination'] }
}

function queryString(filters: MedicalRecordFilters): string {
  const params = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize),
  })
  if (filters.patientId) params.set('patientId', filters.patientId)
  if (filters.authorEmployeeId) params.set('authorEmployeeId', filters.authorEmployeeId)
  if (filters.status) params.set('status', filters.status)
  if (filters.occurredAtFrom) params.set('occurredAtFrom', filters.occurredAtFrom)
  if (filters.occurredAtTo) params.set('occurredAtTo', filters.occurredAtTo)
  if (filters.sortBy) params.set('sortBy', filters.sortBy)
  if (filters.sortOrder) params.set('sortOrder', filters.sortOrder)
  return params.toString()
}

export async function fetchMedicalRecords(
  filters: MedicalRecordFilters,
): Promise<MedicalRecordListResult> {
  const response = await apiClient.getEnvelope<MedicalRecordListItem[]>(
    `/medical-records?${queryString(filters)}`,
  ) as PaginatedResponse
  return { data: response.data, pagination: response.meta.pagination }
}

export function fetchMedicalRecord(id: string): Promise<MedicalRecord> {
  return apiClient.get<MedicalRecord>(`/medical-records/${encodeURIComponent(id)}`)
}

export function createMedicalRecord(input: MedicalRecordInput): Promise<MedicalRecord> {
  return apiClient.post<MedicalRecord>('/medical-records', input)
}

export function updateMedicalRecord(
  id: string,
  input: MedicalRecordUpdate,
): Promise<MedicalRecord> {
  return apiClient.patch<MedicalRecord>(
    `/medical-records/${encodeURIComponent(id)}`,
    input,
  )
}

export function finalizeMedicalRecord(id: string): Promise<MedicalRecord> {
  return apiClient.post<MedicalRecord>(
    `/medical-records/${encodeURIComponent(id)}/finalize`,
    {},
  )
}

export function amendMedicalRecord(
  id: string,
  input: MedicalRecordAmendment,
): Promise<MedicalRecord> {
  return apiClient.post<MedicalRecord>(
    `/medical-records/${encodeURIComponent(id)}/amend`,
    input,
  )
}

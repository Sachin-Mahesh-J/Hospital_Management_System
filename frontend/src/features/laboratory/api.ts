import { apiClient } from '../../api/client'
import type {
  LabRequest,
  LabRequestFilters,
  LabRequestInput,
  LabRequestListItem,
  LabRequestListResult,
  LabResultInput,
  LabTestCatalogItem,
  LabTestFilters,
  LabTestListResult,
} from './types'

type PaginatedRequests = {
  data: LabRequestListItem[]
  meta: { pagination: LabRequestListResult['pagination'] }
}

type PaginatedTests = {
  data: LabTestCatalogItem[]
  meta: { pagination: LabTestListResult['pagination'] }
}

function requestQuery(filters: LabRequestFilters): string {
  const params = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize),
  })
  if (filters.patientId) params.set('patientId', filters.patientId)
  if (filters.requestedByDoctorId) {
    params.set('requestedByDoctorId', filters.requestedByDoctorId)
  }
  if (filters.status) params.set('status', filters.status)
  if (filters.requestedAtFrom) params.set('requestedAtFrom', filters.requestedAtFrom)
  if (filters.requestedAtTo) params.set('requestedAtTo', filters.requestedAtTo)
  if (filters.sortBy) params.set('sortBy', filters.sortBy)
  if (filters.sortOrder) params.set('sortOrder', filters.sortOrder)
  return params.toString()
}

function testQuery(filters: LabTestFilters): string {
  const params = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize),
  })
  if (filters.search) params.set('search', filters.search)
  return params.toString()
}

export async function fetchLabRequests(
  filters: LabRequestFilters,
): Promise<LabRequestListResult> {
  const response = await apiClient.getEnvelope<LabRequestListItem[]>(
    `/lab/requests?${requestQuery(filters)}`,
  ) as PaginatedRequests
  return { data: response.data, pagination: response.meta.pagination }
}

export function fetchLabRequest(id: string): Promise<LabRequest> {
  return apiClient.get<LabRequest>(`/lab/requests/${encodeURIComponent(id)}`)
}

export function createLabRequest(input: LabRequestInput): Promise<LabRequest> {
  return apiClient.post<LabRequest>('/lab/requests', input)
}

export function collectLabSample(
  requestId: string,
  itemId: string,
): Promise<LabRequest> {
  return apiClient.post<LabRequest>(
    `/lab/requests/${encodeURIComponent(requestId)}/items/${encodeURIComponent(itemId)}/sample`,
    {},
  )
}

export function enterLabResult(
  requestId: string,
  itemId: string,
  input: LabResultInput,
): Promise<LabRequest> {
  return apiClient.post<LabRequest>(
    `/lab/requests/${encodeURIComponent(requestId)}/items/${encodeURIComponent(itemId)}/results`,
    input,
  )
}

export async function fetchLabTests(
  filters: LabTestFilters,
): Promise<LabTestListResult> {
  const response = await apiClient.getEnvelope<LabTestCatalogItem[]>(
    `/lab/tests?${testQuery(filters)}`,
  ) as PaginatedTests
  return { data: response.data, pagination: response.meta.pagination }
}

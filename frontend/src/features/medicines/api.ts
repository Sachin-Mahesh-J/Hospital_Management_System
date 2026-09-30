import { apiClient } from '../../api/client'
import type {
  Medicine,
  MedicineFilters,
  MedicineInput,
  MedicineListResult,
  MedicineUpdate,
} from './types'

type PaginatedResponse = {
  data: Medicine[]
  meta: { pagination: MedicineListResult['pagination'] }
}

function queryString(filters: MedicineFilters): string {
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

export async function fetchMedicines(
  filters: MedicineFilters,
): Promise<MedicineListResult> {
  const response = await apiClient.getEnvelope<Medicine[]>(
    `/medicines?${queryString(filters)}`,
  ) as PaginatedResponse
  return { data: response.data, pagination: response.meta.pagination }
}

export function fetchMedicine(id: string): Promise<Medicine> {
  return apiClient.get<Medicine>(`/medicines/${encodeURIComponent(id)}`)
}

export function createMedicine(input: MedicineInput): Promise<Medicine> {
  return apiClient.post<Medicine>('/medicines', input)
}

export function updateMedicine(
  id: string,
  input: MedicineUpdate,
): Promise<Medicine> {
  return apiClient.patch<Medicine>(
    `/medicines/${encodeURIComponent(id)}`,
    input,
  )
}

export function deactivateMedicine(id: string): Promise<Medicine> {
  return apiClient.post<Medicine>(`/medicines/${encodeURIComponent(id)}/deactivate`)
}

export function reactivateMedicine(id: string): Promise<Medicine> {
  return apiClient.post<Medicine>(`/medicines/${encodeURIComponent(id)}/reactivate`)
}

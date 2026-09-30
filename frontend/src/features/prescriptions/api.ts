import { apiClient } from '../../api/client'
import type {
  MedicineCatalogItem,
  MedicineFilters,
  MedicineListResult,
  Prescription,
  PrescriptionFilters,
  PrescriptionInput,
  PrescriptionListItem,
  PrescriptionListResult,
} from './types'

type PaginatedPrescriptions = {
  data: PrescriptionListItem[]
  meta: { pagination: PrescriptionListResult['pagination'] }
}

type PaginatedMedicines = {
  data: MedicineCatalogItem[]
  meta: { pagination: MedicineListResult['pagination'] }
}

function prescriptionQuery(filters: PrescriptionFilters): string {
  const params = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize),
  })
  if (filters.patientId) params.set('patientId', filters.patientId)
  if (filters.medicalRecordId) params.set('medicalRecordId', filters.medicalRecordId)
  if (filters.status) params.set('status', filters.status)
  if (filters.sortBy) params.set('sortBy', filters.sortBy)
  if (filters.sortOrder) params.set('sortOrder', filters.sortOrder)
  return params.toString()
}

function medicineQuery(filters: MedicineFilters): string {
  const params = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize),
  })
  if (filters.search) params.set('search', filters.search)
  if (filters.status) params.set('status', filters.status)
  return params.toString()
}

export async function fetchPrescriptions(
  filters: PrescriptionFilters,
): Promise<PrescriptionListResult> {
  const response = await apiClient.getEnvelope<PrescriptionListItem[]>(
    `/prescriptions?${prescriptionQuery(filters)}`,
  ) as PaginatedPrescriptions
  return { data: response.data, pagination: response.meta.pagination }
}

export function fetchPrescription(id: string): Promise<Prescription> {
  return apiClient.get<Prescription>(`/prescriptions/${encodeURIComponent(id)}`)
}

export function createPrescription(input: PrescriptionInput): Promise<Prescription> {
  return apiClient.post<Prescription>('/prescriptions', input)
}

export function cancelPrescription(
  id: string,
  cancellationReason: string,
): Promise<Prescription> {
  return apiClient.post<Prescription>(
    `/prescriptions/${encodeURIComponent(id)}/cancel`,
    { cancellationReason },
  )
}

export function dispensePrescriptionItem(
  prescriptionId: string,
  itemId: string,
  input: { quantity: string; note?: string | null },
): Promise<Prescription> {
  return apiClient.post<Prescription>(
    `/prescriptions/${encodeURIComponent(prescriptionId)}/items/${encodeURIComponent(itemId)}/dispense`,
    input,
  )
}

export function reverseDispense(
  prescriptionId: string,
  dispenseId: string,
  reason: string,
): Promise<Prescription> {
  return apiClient.post<Prescription>(
    `/prescriptions/${encodeURIComponent(prescriptionId)}/dispenses/${encodeURIComponent(dispenseId)}/reverse`,
    { reason },
  )
}

export async function fetchMedicines(
  filters: MedicineFilters,
): Promise<MedicineListResult> {
  const response = await apiClient.getEnvelope<MedicineCatalogItem[]>(
    `/medicines?${medicineQuery(filters)}`,
  ) as PaginatedMedicines
  return { data: response.data, pagination: response.meta.pagination }
}

import { apiClient } from '../../api/client'
import type {
  DocumentAccess,
  DocumentFilters,
  DocumentListResult,
  DocumentMetadataUpdate,
  PatientDocument,
} from './types'

type PaginatedResponse = {
  data: PatientDocument[]
  meta: { pagination: DocumentListResult['pagination'] }
}

function queryString(filters: DocumentFilters): string {
  const params = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize),
  })
  if (filters.category) params.set('category', filters.category)
  return params.toString()
}

export async function fetchDocuments(
  patientId: string,
  filters: DocumentFilters,
): Promise<DocumentListResult> {
  const response = await apiClient.getEnvelope<PatientDocument[]>(
    `/patients/${encodeURIComponent(patientId)}/documents?${queryString(filters)}`,
  ) as PaginatedResponse
  return { data: response.data, pagination: response.meta.pagination }
}

export function uploadDocument(
  patientId: string,
  form: FormData,
): Promise<PatientDocument> {
  return apiClient.postForm<PatientDocument>(
    `/patients/${encodeURIComponent(patientId)}/documents`,
    form,
  )
}

export function updateDocument(
  patientId: string,
  documentId: string,
  input: DocumentMetadataUpdate,
): Promise<PatientDocument> {
  return apiClient.patch<PatientDocument>(
    `/patients/${encodeURIComponent(patientId)}/documents/${encodeURIComponent(documentId)}`,
    input,
  )
}

export function deleteDocument(
  patientId: string,
  documentId: string,
): Promise<PatientDocument> {
  return apiClient.delete<PatientDocument>(
    `/patients/${encodeURIComponent(patientId)}/documents/${encodeURIComponent(documentId)}`,
  )
}

export function accessDocument(
  patientId: string,
  documentId: string,
): Promise<DocumentAccess> {
  return apiClient.post<DocumentAccess>(
    `/patients/${encodeURIComponent(patientId)}/documents/${encodeURIComponent(documentId)}/access`,
  )
}

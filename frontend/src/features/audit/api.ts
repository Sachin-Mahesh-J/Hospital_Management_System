import { apiClient } from '../../api/client'
import type {
  AuditExportFormat,
  AuditFilters,
  AuditListResult,
  AuditRecord,
} from './types'

type PaginatedResponse = {
  data: AuditRecord[]
  meta: { pagination: AuditListResult['pagination'] }
}

function auditQueryString(
  filters: Omit<AuditFilters, 'page' | 'pageSize'> & {
    page?: number
    pageSize?: number
    format?: AuditExportFormat
  },
): string {
  const params = new URLSearchParams({
    occurredFrom: filters.occurredFrom,
    occurredTo: filters.occurredTo,
  })
  if (filters.page) params.set('page', String(filters.page))
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize))
  if (filters.actorUserId) params.set('actorUserId', filters.actorUserId)
  if (filters.action) params.set('action', filters.action)
  if (filters.resourceType) params.set('resourceType', filters.resourceType)
  if (filters.outcome) params.set('outcome', filters.outcome)
  if (filters.requestId) params.set('requestId', filters.requestId)
  if (filters.format) params.set('format', filters.format)
  return params.toString()
}

export async function fetchAudit(filters: AuditFilters): Promise<AuditListResult> {
  const response = await apiClient.getEnvelope<AuditRecord[]>(
    `/audit?${auditQueryString(filters)}`,
  ) as PaginatedResponse
  return { data: response.data, pagination: response.meta.pagination }
}

export function exportAudit(
  filters: Omit<AuditFilters, 'page' | 'pageSize'>,
  format: AuditExportFormat,
): Promise<Blob> {
  return apiClient.getBlob(`/audit/export?${auditQueryString({ ...filters, format })}`)
}

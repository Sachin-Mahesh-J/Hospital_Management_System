import { useMutation, useQuery } from '@tanstack/react-query'
import { exportAudit, fetchAudit } from './api'
import type { AuditExportFormat, AuditFilters } from './types'

export const auditKeys = {
  all: ['audit'] as const,
  lists: () => [...auditKeys.all, 'list'] as const,
  list: (filters: AuditFilters) => [...auditKeys.lists(), filters] as const,
}

export function useAudit(filters: AuditFilters, enabled = true) {
  return useQuery({
    queryKey: auditKeys.list(filters),
    queryFn: () => fetchAudit(filters),
    enabled,
    placeholderData: (previous) => previous,
  })
}

export function useExportAudit() {
  return useMutation({
    mutationFn: ({
      filters,
      format,
    }: {
      filters: Omit<AuditFilters, 'page' | 'pageSize'>
      format: AuditExportFormat
    }) => exportAudit(filters, format),
  })
}

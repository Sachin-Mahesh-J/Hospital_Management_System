export const auditOutcomes = ['success', 'failure', 'denied'] as const
export type AuditOutcome = (typeof auditOutcomes)[number]

export type SafeAuditMetadata = Record<string, string | number | boolean | string[]>

export type AuditRecord = {
  id: string
  occurredAt: string
  actorUserId: string | null
  actorUsername: string | null
  action: string
  resourceType: string
  resourceId: string | null
  requestId: string | null
  outcome: string
  metadata: SafeAuditMetadata
}

export type AuditFilters = {
  page: number
  pageSize: number
  occurredFrom: string
  occurredTo: string
  actorUserId?: string
  action?: string
  resourceType?: string
  outcome?: AuditOutcome
  requestId?: string
}

export type AuditListResult = {
  data: AuditRecord[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}

export type AuditExportFormat = 'csv' | 'pdf'

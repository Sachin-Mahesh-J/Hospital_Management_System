export const SAFE_AUDIT_METADATA_KEYS = [
  'fields',
  'from',
  'to',
  'reason',
  'statusChanged',
  'departmentChanged',
  'replacementId',
  'rescheduledFrom',
  'detectedDuring',
  'failedLoginCount',
  'format',
  'rowCount',
  'permission',
  'roles',
] as const

export type SafeAuditMetadata = Record<string, string | number | boolean | string[]>

export type SafeAuditDto = {
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

const safeKeySet = new Set<string>(SAFE_AUDIT_METADATA_KEYS)

function isSafePrimitive(value: unknown): value is string | number | boolean {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  )
}

export function sanitizeAuditMetadata(value: unknown): SafeAuditMetadata {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  const output: SafeAuditMetadata = {}
  for (const [key, entry] of Object.entries(value)) {
    if (!safeKeySet.has(key)) continue
    if (Array.isArray(entry) && entry.every((item) => typeof item === 'string')) {
      output[key] = entry
      continue
    }
    if (isSafePrimitive(entry)) {
      output[key] = entry
    }
  }
  return output
}

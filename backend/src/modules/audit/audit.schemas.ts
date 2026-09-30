import { z } from 'zod'
import { calendarDaysInclusive } from '../../config/hospitalTime.js'

export const AUDIT_OUTCOMES = ['success', 'failure', 'denied'] as const
export const MAX_AUDIT_RANGE_DAYS = 366
export const AUDIT_EXPORT_FORMATS = ['csv', 'pdf'] as const

const instantSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/,
    'Must be a timezone-aware ISO-8601 timestamp.',
  )
  .refine(
    (value) => !Number.isNaN(Date.parse(value)),
    'Must be a valid timestamp.',
  )

const auditFilterFields = {
  occurredFrom: instantSchema,
  occurredTo: instantSchema,
  actorUserId: z.string().uuid().optional(),
  action: z.string().trim().min(1).max(100).optional(),
  resourceType: z.string().trim().min(1).max(100).optional(),
  outcome: z.enum(AUDIT_OUTCOMES).optional(),
  requestId: z.string().uuid().optional(),
}

function validRange(input: { occurredFrom: string; occurredTo: string }): boolean {
  return Date.parse(input.occurredTo) > Date.parse(input.occurredFrom)
}

function withinMaxRange(input: {
  occurredFrom: string
  occurredTo: string
}): boolean {
  const from = input.occurredFrom.slice(0, 10)
  const to = input.occurredTo.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return true
  }
  return calendarDaysInclusive(from, to) <= MAX_AUDIT_RANGE_DAYS
}

export const listAuditQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    ...auditFilterFields,
  })
  .strict()
  .refine(validRange, {
    message: 'occurredTo must be after occurredFrom.',
    path: ['occurredTo'],
  })
  .refine(withinMaxRange, {
    message: `Date range cannot exceed ${MAX_AUDIT_RANGE_DAYS} days.`,
    path: ['occurredTo'],
  })

export const exportAuditQuerySchema = z
  .object({
    format: z.enum(AUDIT_EXPORT_FORMATS),
    ...auditFilterFields,
  })
  .strict()
  .refine(validRange, {
    message: 'occurredTo must be after occurredFrom.',
    path: ['occurredTo'],
  })
  .refine(withinMaxRange, {
    message: `Date range cannot exceed ${MAX_AUDIT_RANGE_DAYS} days.`,
    path: ['occurredTo'],
  })

export type ListAuditQuery = z.infer<typeof listAuditQuerySchema>
export type ExportAuditQuery = z.infer<typeof exportAuditQuerySchema>
export type AuditFilterQuery = Omit<ListAuditQuery, 'page' | 'pageSize'>

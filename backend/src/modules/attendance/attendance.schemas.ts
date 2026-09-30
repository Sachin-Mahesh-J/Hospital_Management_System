import { z } from 'zod'

export const ATTENDANCE_STATUSES = ['present', 'absent', 'leave'] as const
export const ATTENDANCE_SORT_FIELDS = [
  'workDate',
  'status',
  'createdAt',
] as const

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be a valid date in YYYY-MM-DD format.')
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`)
    return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().startsWith(value)
  }, 'Must be a valid calendar date.')

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

const optionalNote = z.string().trim().min(1).max(500).nullable().optional()

function validTimes(input: {
  checkInAt?: string | null | undefined
  checkOutAt?: string | null | undefined
}): boolean {
  if (!input.checkOutAt) return true
  if (!input.checkInAt) return false
  return Date.parse(input.checkOutAt) > Date.parse(input.checkInAt)
}

export const createAttendanceBodySchema = z
  .object({
    employeeId: z.string().uuid(),
    workDate: dateOnlySchema,
    status: z.enum(ATTENDANCE_STATUSES),
    checkInAt: instantSchema.nullable().optional(),
    checkOutAt: instantSchema.nullable().optional(),
    note: optionalNote,
  })
  .strict()
  .refine(validTimes, {
    message: 'Check-out requires check-in and must be later than check-in.',
    path: ['checkOutAt'],
  })

export const updateAttendanceBodySchema = z
  .object({
    status: z.enum(ATTENDANCE_STATUSES).optional(),
    checkInAt: instantSchema.nullable().optional(),
    checkOutAt: instantSchema.nullable().optional(),
    note: optionalNote,
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0, {
    message: 'At least one attendance field must be supplied.',
  })
  .refine(validTimes, {
    message: 'Check-out requires check-in and must be later than check-in.',
    path: ['checkOutAt'],
  })

export const attendanceIdParamsSchema = z
  .object({ id: z.string().uuid() })
  .strict()

export const listAttendanceQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    employeeId: z.string().uuid().optional(),
    status: z.enum(ATTENDANCE_STATUSES).optional(),
    workDateFrom: dateOnlySchema.optional(),
    workDateTo: dateOnlySchema.optional(),
    sortBy: z.enum(ATTENDANCE_SORT_FIELDS).default('workDate'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict()
  .refine(
    (query) =>
      !query.workDateFrom ||
      !query.workDateTo ||
      query.workDateFrom <= query.workDateTo,
    {
      message: 'workDateTo must be on or after workDateFrom.',
      path: ['workDateTo'],
    },
  )

export type CreateAttendanceBody = z.infer<typeof createAttendanceBodySchema>
export type UpdateAttendanceBody = z.infer<typeof updateAttendanceBodySchema>
export type ListAttendanceQuery = z.infer<typeof listAttendanceQuerySchema>

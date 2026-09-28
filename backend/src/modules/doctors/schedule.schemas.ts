import { z } from 'zod'

export const SCHEDULE_STATUSES = [
  'available',
  'unavailable',
  'cancelled',
] as const
export const SCHEDULE_SORT_FIELDS = [
  'startsAt',
  'endsAt',
  'status',
  'createdAt',
] as const

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

function validInterval(input: {
  startsAt?: string | undefined
  endsAt?: string | undefined
}): boolean {
  if (!input.startsAt || !input.endsAt) return true
  return Date.parse(input.endsAt) > Date.parse(input.startsAt)
}

export const createScheduleBodySchema = z
  .object({
    startsAt: instantSchema,
    endsAt: instantSchema,
    status: z.enum(SCHEDULE_STATUSES).optional(),
    note: optionalNote,
  })
  .strict()
  .refine(validInterval, {
    message: 'Schedule end must be after schedule start.',
    path: ['endsAt'],
  })

export const updateScheduleBodySchema = z
  .object({
    startsAt: instantSchema.optional(),
    endsAt: instantSchema.optional(),
    status: z.enum(SCHEDULE_STATUSES).optional(),
    note: optionalNote,
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0, {
    message: 'At least one schedule field must be supplied.',
  })
  .refine(validInterval, {
    message: 'Schedule end must be after schedule start.',
    path: ['endsAt'],
  })

export const scheduleDoctorParamsSchema = z
  .object({ doctorId: z.string().uuid() })
  .strict()

export const scheduleParamsSchema = z
  .object({
    doctorId: z.string().uuid(),
    scheduleId: z.string().uuid(),
  })
  .strict()

export const listSchedulesQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(SCHEDULE_STATUSES).optional(),
    sortBy: z.enum(SCHEDULE_SORT_FIELDS).default('startsAt'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  })
  .strict()

export type CreateScheduleBody = z.infer<typeof createScheduleBodySchema>
export type UpdateScheduleBody = z.infer<typeof updateScheduleBodySchema>
export type ListSchedulesQuery = z.infer<typeof listSchedulesQuerySchema>

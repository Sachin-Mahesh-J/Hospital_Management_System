import { z } from 'zod'
import { calendarDaysInclusive } from '../../config/hospitalTime.js'

export const LEAVE_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'cancelled',
] as const
export const LEAVE_SORT_FIELDS = [
  'startsOn',
  'endsOn',
  'status',
  'createdAt',
] as const
export const ACTIVE_LEAVE_STATUSES = ['pending', 'approved'] as const
export const MAX_LEAVE_RANGE_DAYS = 366

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be a valid date in YYYY-MM-DD format.')
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`)
    return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().startsWith(value)
  }, 'Must be a valid calendar date.')

const optionalText = (maximum: number) =>
  z.string().trim().min(1).max(maximum).nullable().optional()

function validDateRange(input: {
  startsOn?: string | undefined
  endsOn?: string | undefined
}): boolean {
  if (!input.startsOn || !input.endsOn) return true
  return input.endsOn >= input.startsOn
}

function withinMaxRange(input: {
  startsOn?: string | undefined
  endsOn?: string | undefined
}): boolean {
  if (!input.startsOn || !input.endsOn) return true
  return calendarDaysInclusive(input.startsOn, input.endsOn) <= MAX_LEAVE_RANGE_DAYS
}

export const createLeaveBodySchema = z
  .object({
    leaveType: z.string().trim().min(1).max(50),
    startsOn: dateOnlySchema,
    endsOn: dateOnlySchema,
    reason: optionalText(2000),
  })
  .strict()
  .refine(validDateRange, {
    message: 'Leave end date must be on or after the start date.',
    path: ['endsOn'],
  })
  .refine(withinMaxRange, {
    message: `Leave duration cannot exceed ${MAX_LEAVE_RANGE_DAYS} days.`,
    path: ['endsOn'],
  })

export const updateLeaveBodySchema = z
  .object({
    leaveType: z.string().trim().min(1).max(50).optional(),
    startsOn: dateOnlySchema.optional(),
    endsOn: dateOnlySchema.optional(),
    reason: optionalText(2000),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0, {
    message: 'At least one leave field must be supplied.',
  })
  .refine(validDateRange, {
    message: 'Leave end date must be on or after the start date.',
    path: ['endsOn'],
  })
  .refine(withinMaxRange, {
    message: `Leave duration cannot exceed ${MAX_LEAVE_RANGE_DAYS} days.`,
    path: ['endsOn'],
  })

export const decideLeaveBodySchema = z.preprocess(
  (value) => value ?? {},
  z
    .object({
      decisionNote: optionalText(500),
    })
    .strict(),
)

export const leaveIdParamsSchema = z
  .object({ id: z.string().uuid() })
  .strict()

export const listLeaveQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    employeeId: z.string().uuid().optional(),
    status: z.enum(LEAVE_STATUSES).optional(),
    startsOnFrom: dateOnlySchema.optional(),
    startsOnTo: dateOnlySchema.optional(),
    overlapsFrom: dateOnlySchema.optional(),
    overlapsTo: dateOnlySchema.optional(),
    sortBy: z.enum(LEAVE_SORT_FIELDS).default('startsOn'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict()
  .refine(
    (query) =>
      !query.startsOnFrom ||
      !query.startsOnTo ||
      query.startsOnFrom <= query.startsOnTo,
    {
      message: 'startsOnTo must be on or after startsOnFrom.',
      path: ['startsOnTo'],
    },
  )
  .refine(
    (query) =>
      !query.overlapsFrom ||
      !query.overlapsTo ||
      query.overlapsFrom <= query.overlapsTo,
    {
      message: 'overlapsTo must be on or after overlapsFrom.',
      path: ['overlapsTo'],
    },
  )

export type CreateLeaveBody = z.infer<typeof createLeaveBodySchema>
export type UpdateLeaveBody = z.infer<typeof updateLeaveBodySchema>
export type DecideLeaveBody = z.infer<typeof decideLeaveBodySchema>
export type ListLeaveQuery = z.infer<typeof listLeaveQuerySchema>

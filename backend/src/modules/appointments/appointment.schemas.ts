import { z } from 'zod'

export const APPOINTMENT_STATUSES = [
  'scheduled',
  'checked_in',
  'completed',
  'cancelled',
  'no_show',
] as const
export const APPOINTMENT_STATUS_UPDATE_VALUES = [
  'checked_in',
  'completed',
  'no_show',
] as const
export const APPOINTMENT_SORT_FIELDS = [
  'startsAt',
  'endsAt',
  'status',
  'createdAt',
] as const
export const ACTIVE_APPOINTMENT_STATUSES = ['scheduled', 'checked_in'] as const

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

const optionalReason = z.string().trim().min(1).max(1000).nullable().optional()

function validInterval(input: {
  startsAt?: string | undefined
  endsAt?: string | undefined
}): boolean {
  if (!input.startsAt || !input.endsAt) return true
  return Date.parse(input.endsAt) > Date.parse(input.startsAt)
}

export const createAppointmentBodySchema = z
  .object({
    patientId: z.string().uuid(),
    doctorId: z.string().uuid(),
    startsAt: instantSchema,
    endsAt: instantSchema,
    reason: optionalReason,
  })
  .strict()
  .refine(validInterval, {
    message: 'Appointment end must be after appointment start.',
    path: ['endsAt'],
  })

export const updateAppointmentBodySchema = z
  .object({
    reason: z.string().trim().min(1).max(1000).nullable(),
  })
  .strict()

export const cancelAppointmentBodySchema = z
  .object({
    cancellationReason: z.string().trim().min(1).max(500),
  })
  .strict()

export const rescheduleAppointmentBodySchema = z
  .object({
    patientId: z.string().uuid().optional(),
    doctorId: z.string().uuid(),
    startsAt: instantSchema,
    endsAt: instantSchema,
    reason: optionalReason,
  })
  .strict()
  .refine(validInterval, {
    message: 'Appointment end must be after appointment start.',
    path: ['endsAt'],
  })

export const updateAppointmentStatusBodySchema = z
  .object({
    status: z.enum(APPOINTMENT_STATUS_UPDATE_VALUES),
  })
  .strict()

export const appointmentIdParamsSchema = z
  .object({ id: z.string().uuid() })
  .strict()

export const listAppointmentsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    patientId: z.string().uuid().optional(),
    doctorId: z.string().uuid().optional(),
    status: z.enum(APPOINTMENT_STATUSES).optional(),
    startsAtFrom: instantSchema.optional(),
    startsAtTo: instantSchema.optional(),
    sortBy: z.enum(APPOINTMENT_SORT_FIELDS).default('startsAt'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  })
  .strict()
  .refine(
    (query) =>
      !query.startsAtFrom ||
      !query.startsAtTo ||
      Date.parse(query.startsAtTo) > Date.parse(query.startsAtFrom),
    {
      message: 'startsAtTo must be after startsAtFrom.',
      path: ['startsAtTo'],
    },
  )

export type CreateAppointmentBody = z.infer<typeof createAppointmentBodySchema>
export type UpdateAppointmentBody = z.infer<typeof updateAppointmentBodySchema>
export type CancelAppointmentBody = z.infer<typeof cancelAppointmentBodySchema>
export type RescheduleAppointmentBody = z.infer<
  typeof rescheduleAppointmentBodySchema
>
export type UpdateAppointmentStatusBody = z.infer<
  typeof updateAppointmentStatusBodySchema
>
export type ListAppointmentsQuery = z.infer<typeof listAppointmentsQuerySchema>

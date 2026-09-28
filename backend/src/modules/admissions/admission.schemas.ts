import { z } from 'zod'

export const ADMISSION_STATUSES = ['admitted', 'discharged', 'cancelled'] as const
export const ADMISSION_SORT_FIELDS = [
  'admittedAt',
  'admissionNumber',
  'status',
  'createdAt',
] as const

const optionalUuid = z.string().uuid().nullable().optional()
const requiredReason = z.string().trim().min(1).max(5000)
const requiredSummary = z.string().trim().min(1).max(5000)
const cancellationReason = z.string().trim().min(1).max(500)

export const createAdmissionBodySchema = z
  .object({
    patientId: z.string().uuid(),
    attendingDoctorId: optionalUuid,
    reason: requiredReason,
  })
  .strict()

export const updateAdmissionBodySchema = z
  .object({
    attendingDoctorId: optionalUuid,
    reason: requiredReason.optional(),
  })
  .strict()
  .refine(
    (input) => input.attendingDoctorId !== undefined || input.reason !== undefined,
    {
      message: 'At least one admission field must be supplied.',
    },
  )

export const dischargeAdmissionBodySchema = z
  .object({
    dischargeSummary: requiredSummary,
  })
  .strict()

export const cancelAdmissionBodySchema = z
  .object({
    reason: cancellationReason,
  })
  .strict()

export const admissionIdParamsSchema = z
  .object({ id: z.string().uuid() })
  .strict()

export const listAdmissionsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    patientId: z.string().uuid().optional(),
    attendingDoctorId: z.string().uuid().optional(),
    status: z.enum(ADMISSION_STATUSES).optional(),
    sortBy: z.enum(ADMISSION_SORT_FIELDS).default('admittedAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict()

export type CreateAdmissionBody = z.infer<typeof createAdmissionBodySchema>
export type UpdateAdmissionBody = z.infer<typeof updateAdmissionBodySchema>
export type DischargeAdmissionBody = z.infer<typeof dischargeAdmissionBodySchema>
export type CancelAdmissionBody = z.infer<typeof cancelAdmissionBodySchema>
export type ListAdmissionsQuery = z.infer<typeof listAdmissionsQuerySchema>

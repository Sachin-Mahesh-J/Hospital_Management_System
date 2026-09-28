import { z } from 'zod'

export const PRESCRIPTION_STATUSES = [
  'active',
  'partially_dispensed',
  'dispensed',
  'cancelled',
  'expired',
] as const
export const PRESCRIPTION_SORT_FIELDS = [
  'prescribedAt',
  'createdAt',
  'status',
] as const

const quantitySchema = z
  .union([z.number(), z.string()])
  .refine((value) => {
    const parsed = typeof value === 'number' ? value : Number(value)
    return Number.isFinite(parsed) && parsed > 0
  }, 'Quantity must be greater than zero.')
  .refine((value) => {
    const text = typeof value === 'number' ? value.toString() : value.trim()
    return /^\d{1,10}(?:\.\d{1,4})?$/.test(text)
  }, 'Quantity must have at most four decimal places.')
  .transform((value) => (typeof value === 'number' ? value.toString() : value.trim()))

export const prescriptionItemInputSchema = z
  .object({
    medicineId: z.string().uuid(),
    dosage: z.string().trim().min(1).max(100),
    route: z.string().trim().min(1).max(50).nullable().optional(),
    frequency: z.string().trim().min(1).max(100),
    duration: z.string().trim().min(1).max(100),
    instructions: z.string().trim().min(1).max(2000).nullable().optional(),
    quantityPrescribed: quantitySchema,
    unit: z.string().trim().min(1).max(30),
  })
  .strict()

export const createPrescriptionBodySchema = z
  .object({
    medicalRecordId: z.string().uuid(),
    notes: z.string().trim().min(1).max(2000).nullable().optional(),
    items: z.array(prescriptionItemInputSchema).min(1).max(50),
  })
  .strict()

export const cancelPrescriptionBodySchema = z
  .object({
    cancellationReason: z.string().trim().min(1).max(500),
  })
  .strict()

export const prescriptionIdParamsSchema = z
  .object({ id: z.string().uuid() })
  .strict()

export const listPrescriptionsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    patientId: z.string().uuid().optional(),
    medicalRecordId: z.string().uuid().optional(),
    status: z.enum(PRESCRIPTION_STATUSES).optional(),
    sortBy: z.enum(PRESCRIPTION_SORT_FIELDS).default('prescribedAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict()

export type CreatePrescriptionBody = z.infer<typeof createPrescriptionBodySchema>
export type CancelPrescriptionBody = z.infer<typeof cancelPrescriptionBodySchema>
export type ListPrescriptionsQuery = z.infer<typeof listPrescriptionsQuerySchema>

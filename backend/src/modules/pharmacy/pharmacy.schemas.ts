import { z } from 'zod'

export const STOCK_MOVEMENT_TYPES = [
  'receipt',
  'dispense',
  'adjustment',
  'return',
  'disposal',
] as const

export const BATCH_STATUSES = [
  'active',
  'depleted',
  'expired',
  'quarantined',
] as const

export const INVENTORY_SORT_FIELDS = [
  'genericName',
  'expiryDate',
  'batchNumber',
  'receivedAt',
] as const

export const MOVEMENT_SORT_FIELDS = ['occurredAt', 'movementType'] as const

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
  .transform((value) =>
    typeof value === 'number' ? value.toString() : value.trim(),
  )

const signedAdjustmentSchema = z
  .union([z.number(), z.string()])
  .refine((value) => {
    const parsed = typeof value === 'number' ? value : Number(value)
    return Number.isFinite(parsed) && parsed !== 0
  }, 'Adjustment quantity must be a non-zero number.')
  .refine((value) => {
    const text = typeof value === 'number' ? value.toString() : value.trim()
    return /^-?\d{1,10}(?:\.\d{1,4})?$/.test(text)
  }, 'Quantity must have at most four decimal places.')
  .transform((value) =>
    typeof value === 'number' ? value.toString() : value.trim(),
  )

const moneySchema = z
  .union([z.number(), z.string()])
  .refine((value) => {
    const parsed = typeof value === 'number' ? value : Number(value)
    return Number.isFinite(parsed) && parsed >= 0
  }, 'Amount must be zero or greater.')
  .refine((value) => {
    const text = typeof value === 'number' ? value.toString() : value.trim()
    return /^\d{1,15}(?:\.\d{1,4})?$/.test(text)
  }, 'Amount must have at most four decimal places.')
  .transform((value) =>
    typeof value === 'number' ? value.toString() : value.trim(),
  )

const expiryDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expiry date must be YYYY-MM-DD.')
  .refine((value) => {
    const [yearText, monthText, dayText] = value.split('-')
    const year = Number(yearText)
    const month = Number(monthText)
    const day = Number(dayText)
    const date = new Date(Date.UTC(year, month - 1, day))
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    )
  }, 'Expiry date must be a valid calendar date.')

export const receiveStockBodySchema = z
  .object({
    medicineId: z.string().uuid(),
    batchNumber: z.string().trim().min(1).max(100),
    expiryDate: expiryDateSchema,
    quantity: quantitySchema,
    unitCost: moneySchema,
    salePriceSnapshot: moneySchema,
    currency: z.string().regex(/^[A-Z]{3}$/, 'Currency must be an ISO 4217 code.'),
  })
  .strict()

export const adjustStockBodySchema = z
  .object({
    medicineBatchId: z.string().uuid(),
    quantity: signedAdjustmentSchema,
    reason: z.string().trim().min(1).max(500),
  })
  .strict()

export const dispenseItemBodySchema = z
  .object({
    quantity: quantitySchema,
    note: z.string().trim().min(1).max(500).nullable().optional(),
  })
  .strict()

export const reverseDispenseBodySchema = z
  .object({
    reason: z.string().trim().min(1).max(500),
  })
  .strict()

export const prescriptionItemParamsSchema = z
  .object({
    id: z.string().uuid(),
    itemId: z.string().uuid(),
  })
  .strict()

export const prescriptionDispenseParamsSchema = z
  .object({
    id: z.string().uuid(),
    dispenseId: z.string().uuid(),
  })
  .strict()

export const listInventoryQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    medicineId: z.string().uuid().optional(),
    search: z.string().trim().min(1).max(200).optional(),
    status: z.enum(BATCH_STATUSES).optional(),
    sortBy: z.enum(INVENTORY_SORT_FIELDS).default('expiryDate'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  })
  .strict()

export const listMovementsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    medicineId: z.string().uuid().optional(),
    medicineBatchId: z.string().uuid().optional(),
    movementType: z.enum(STOCK_MOVEMENT_TYPES).optional(),
    occurredAtFrom: instantSchema.optional(),
    occurredAtTo: instantSchema.optional(),
    sortBy: z.enum(MOVEMENT_SORT_FIELDS).default('occurredAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict()
  .refine(
    (query) =>
      !query.occurredAtFrom ||
      !query.occurredAtTo ||
      Date.parse(query.occurredAtTo) > Date.parse(query.occurredAtFrom),
    {
      message: 'occurredAtTo must be after occurredAtFrom.',
      path: ['occurredAtTo'],
    },
  )

export type ReceiveStockBody = z.infer<typeof receiveStockBodySchema>
export type AdjustStockBody = z.infer<typeof adjustStockBodySchema>
export type DispenseItemBody = z.infer<typeof dispenseItemBodySchema>
export type ReverseDispenseBody = z.infer<typeof reverseDispenseBodySchema>
export type ListInventoryQuery = z.infer<typeof listInventoryQuerySchema>
export type ListMovementsQuery = z.infer<typeof listMovementsQuerySchema>

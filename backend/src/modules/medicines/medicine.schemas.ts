import { z } from 'zod'

export const MEDICINE_STATUSES = ['active', 'inactive'] as const
export const MEDICINE_SORT_FIELDS = [
  'code',
  'genericName',
  'status',
  'createdAt',
] as const

const optionalText = (maximum: number) =>
  z.string().trim().min(1).max(maximum).nullable().optional()

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

const thresholdSchema = z
  .union([z.number(), z.string()])
  .refine((value) => {
    const parsed = typeof value === 'number' ? value : Number(value)
    return Number.isFinite(parsed) && parsed >= 0
  }, 'Low-stock threshold must be zero or greater.')
  .refine((value) => {
    const text = typeof value === 'number' ? value.toString() : value.trim()
    return /^\d{1,10}(?:\.\d{1,4})?$/.test(text)
  }, 'Low-stock threshold must have at most four decimal places.')
  .transform((value) =>
    typeof value === 'number' ? value.toString() : value.trim(),
  )

const medicineFields = {
  code: z.string().trim().min(1).max(50),
  genericName: z.string().trim().min(1).max(200),
  brandName: optionalText(200),
  dosageForm: z.string().trim().min(1).max(100),
  strength: optionalText(100),
  inventoryUnit: z.string().trim().min(1).max(30),
  defaultSalePrice: moneySchema,
  currency: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .pipe(z.string().regex(/^[A-Z]{3}$/, 'Currency must be an ISO 4217 code.')),
  lowStockThreshold: thresholdSchema,
}

export const createMedicineBodySchema = z
  .object({
    code: medicineFields.code,
    genericName: medicineFields.genericName,
    brandName: medicineFields.brandName,
    dosageForm: medicineFields.dosageForm,
    strength: medicineFields.strength,
    inventoryUnit: medicineFields.inventoryUnit,
    defaultSalePrice: medicineFields.defaultSalePrice.optional(),
    currency: medicineFields.currency,
    lowStockThreshold: medicineFields.lowStockThreshold.optional(),
  })
  .strict()

export const updateMedicineBodySchema = z
  .object({
    code: medicineFields.code.optional(),
    genericName: medicineFields.genericName.optional(),
    brandName: medicineFields.brandName,
    dosageForm: medicineFields.dosageForm.optional(),
    strength: medicineFields.strength,
    inventoryUnit: medicineFields.inventoryUnit.optional(),
    defaultSalePrice: medicineFields.defaultSalePrice.optional(),
    currency: medicineFields.currency.optional(),
    lowStockThreshold: medicineFields.lowStockThreshold.optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0, {
    message: 'At least one medicine field must be supplied.',
  })

export const medicineIdParamsSchema = z
  .object({ id: z.string().uuid() })
  .strict()

export const listMedicinesQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().min(1).max(200).optional(),
    status: z.enum(MEDICINE_STATUSES).optional(),
    sortBy: z.enum(MEDICINE_SORT_FIELDS).default('genericName'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  })
  .strict()

export type CreateMedicineBody = z.infer<typeof createMedicineBodySchema>
export type UpdateMedicineBody = z.infer<typeof updateMedicineBodySchema>
export type ListMedicinesQuery = z.infer<typeof listMedicinesQuerySchema>

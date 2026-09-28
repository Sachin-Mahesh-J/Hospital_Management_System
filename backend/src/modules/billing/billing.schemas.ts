import { z } from 'zod'
import {
  INVOICE_STATUSES,
  PAYMENT_METHODS,
} from './billing.lifecycle.js'

export const INVOICE_SORT_FIELDS = [
  'invoiceNumber',
  'issuedAt',
  'status',
  'totalAmount',
  'createdAt',
] as const

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

const positiveMoneySchema = z
  .union([z.number(), z.string()])
  .refine((value) => {
    const parsed = typeof value === 'number' ? value : Number(value)
    return Number.isFinite(parsed) && parsed > 0
  }, 'Amount must be greater than zero.')
  .refine((value) => {
    const text = typeof value === 'number' ? value.toString() : value.trim()
    return /^\d{1,15}(?:\.\d{1,4})?$/.test(text)
  }, 'Amount must have at most four decimal places.')
  .transform((value) =>
    typeof value === 'number' ? value.toString() : value.trim(),
  )

const consultationItemSchema = z
  .object({
    category: z.literal('consultation'),
    appointmentId: z.string().uuid(),
    unitPrice: moneySchema,
  })
  .strict()

const laboratoryItemSchema = z
  .object({
    category: z.literal('laboratory'),
    labRequestItemId: z.string().uuid(),
  })
  .strict()

const pharmacyItemSchema = z
  .object({
    category: z.literal('pharmacy'),
    dispenseRecordId: z.string().uuid(),
  })
  .strict()

export const invoiceItemInputSchema = z.discriminatedUnion('category', [
  consultationItemSchema,
  laboratoryItemSchema,
  pharmacyItemSchema,
])

export const createInvoiceBodySchema = z
  .object({
    patientId: z.string().uuid(),
    items: z.array(invoiceItemInputSchema).min(1).max(200),
  })
  .strict()

export const updateInvoiceBodySchema = z
  .object({
    items: z.array(invoiceItemInputSchema).min(1).max(200),
  })
  .strict()

export const voidInvoiceBodySchema = z
  .object({
    reason: z.string().trim().min(1).max(500),
  })
  .strict()

export const createPaymentBodySchema = z
  .object({
    amount: positiveMoneySchema,
    method: z.enum(PAYMENT_METHODS),
    externalReference: z.string().trim().min(1).max(200).nullable().optional(),
  })
  .strict()

export const reversePaymentBodySchema = z
  .object({
    reason: z.string().trim().min(1).max(500),
  })
  .strict()

export const invoiceIdParamsSchema = z
  .object({
    id: z.string().uuid(),
  })
  .strict()

export const paymentIdParamsSchema = z
  .object({
    id: z.string().uuid(),
  })
  .strict()

export const billingPatientIdParamsSchema = z
  .object({
    patientId: z.string().uuid(),
  })
  .strict()

export const listInvoicesQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().min(1).max(200).optional(),
    status: z.enum(INVOICE_STATUSES).optional(),
    patientId: z.string().uuid().optional(),
    sortBy: z.enum(INVOICE_SORT_FIELDS).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict()

export const listBillingPatientsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().min(1).max(200).optional(),
  })
  .strict()

export type CreateInvoiceBody = z.infer<typeof createInvoiceBodySchema>
export type UpdateInvoiceBody = z.infer<typeof updateInvoiceBodySchema>
export type VoidInvoiceBody = z.infer<typeof voidInvoiceBodySchema>
export type CreatePaymentBody = z.infer<typeof createPaymentBodySchema>
export type ReversePaymentBody = z.infer<typeof reversePaymentBodySchema>
export type ListInvoicesQuery = z.infer<typeof listInvoicesQuerySchema>
export type ListBillingPatientsQuery = z.infer<
  typeof listBillingPatientsQuerySchema
>
export type InvoiceItemInput = z.infer<typeof invoiceItemInputSchema>

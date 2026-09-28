import { z } from 'zod'
import { LAB_REQUEST_STATUSES } from './laboratory.lifecycle.js'

export const LAB_SORT_FIELDS = ['requestedAt', 'createdAt', 'status'] as const

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

export const labTestItemInputSchema = z
  .object({
    testDefinitionId: z.string().uuid(),
  })
  .strict()

export const createLabRequestBodySchema = z
  .object({
    patientId: z.string().uuid(),
    medicalRecordId: z.string().uuid().nullable().optional(),
    clinicalNote: z.string().trim().min(1).max(2000).nullable().optional(),
    items: z.array(labTestItemInputSchema).min(1).max(50),
  })
  .strict()

export const collectSampleBodySchema = z.object({}).strict()

export const enterLabResultBodySchema = z
  .object({
    resultValue: z.string().trim().min(1).max(10_000),
    resultUnit: z.string().trim().min(1).max(50).nullable().optional(),
    referenceRangeSnapshot: z.string().trim().min(1).max(2000).nullable().optional(),
    resultNote: z.string().trim().min(1).max(2000).nullable().optional(),
  })
  .strict()

export const labRequestIdParamsSchema = z
  .object({ id: z.string().uuid() })
  .strict()

export const labRequestItemParamsSchema = z
  .object({
    id: z.string().uuid(),
    itemId: z.string().uuid(),
  })
  .strict()

export const listLabTestsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().min(1).max(200).optional(),
    sortBy: z.enum(['code', 'name']).default('name'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  })
  .strict()

export const listLabRequestsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    patientId: z.string().uuid().optional(),
    requestedByDoctorId: z.string().uuid().optional(),
    status: z.enum(LAB_REQUEST_STATUSES).optional(),
    requestedAtFrom: instantSchema.optional(),
    requestedAtTo: instantSchema.optional(),
    sortBy: z.enum(LAB_SORT_FIELDS).default('requestedAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict()
  .refine(
    (query) =>
      !query.requestedAtFrom ||
      !query.requestedAtTo ||
      Date.parse(query.requestedAtTo) > Date.parse(query.requestedAtFrom),
    {
      message: 'requestedAtTo must be after requestedAtFrom.',
      path: ['requestedAtTo'],
    },
  )

export type CreateLabRequestBody = z.infer<typeof createLabRequestBodySchema>
export type EnterLabResultBody = z.infer<typeof enterLabResultBodySchema>
export type ListLabTestsQuery = z.infer<typeof listLabTestsQuerySchema>
export type ListLabRequestsQuery = z.infer<typeof listLabRequestsQuerySchema>

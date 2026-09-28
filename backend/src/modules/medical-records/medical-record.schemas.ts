import { z } from 'zod'

export const MEDICAL_RECORD_STATUSES = ['draft', 'final', 'amended'] as const
export const MEDICAL_RECORD_SORT_FIELDS = [
  'occurredAt',
  'createdAt',
  'status',
] as const

export const instantSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/,
    'Must be a timezone-aware ISO-8601 timestamp.',
  )
  .refine(
    (value) => !Number.isNaN(Date.parse(value)),
    'Must be a valid timestamp.',
  )

const optionalUuid = z.string().uuid().nullable().optional()

export const diagnosisInputSchema = z
  .object({
    diagnosisText: z.string().trim().min(1).max(10_000),
  })
  .strict()

export const treatmentInputSchema = z
  .object({
    treatmentText: z.string().trim().min(1).max(10_000),
  })
  .strict()

export const medicalReportInputSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    reportText: z.string().trim().min(1).max(20_000),
  })
  .strict()

function atMostOneContext(input: {
  appointmentId?: string | null | undefined
  admissionId?: string | null | undefined
}): boolean {
  return !(input.appointmentId && input.admissionId)
}

export const createMedicalRecordBodySchema = z
  .object({
    patientId: z.string().uuid(),
    occurredAt: instantSchema,
    appointmentId: optionalUuid,
    admissionId: optionalUuid,
    diagnoses: z.array(diagnosisInputSchema).max(50).optional(),
    treatments: z.array(treatmentInputSchema).max(50).optional(),
    reports: z.array(medicalReportInputSchema).max(20).optional(),
  })
  .strict()
  .refine(atMostOneContext, {
    message: 'A medical record may have an appointment or an admission, not both.',
    path: ['admissionId'],
  })

export const updateMedicalRecordBodySchema = z
  .object({
    occurredAt: instantSchema.optional(),
    appointmentId: optionalUuid,
    admissionId: optionalUuid,
    diagnoses: z.array(diagnosisInputSchema).max(50).optional(),
    treatments: z.array(treatmentInputSchema).max(50).optional(),
    reports: z.array(medicalReportInputSchema).max(20).optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0, {
    message: 'At least one draft field must be provided.',
  })
  .refine(atMostOneContext, {
    message: 'A medical record may have an appointment or an admission, not both.',
    path: ['admissionId'],
  })

export const amendMedicalRecordBodySchema = z
  .object({
    occurredAt: instantSchema,
    appointmentId: optionalUuid,
    admissionId: optionalUuid,
    diagnoses: z.array(diagnosisInputSchema).max(50).optional(),
    treatments: z.array(treatmentInputSchema).max(50).optional(),
    reports: z.array(medicalReportInputSchema).max(20).optional(),
    reason: z.string().trim().min(1).max(500),
  })
  .strict()
  .refine(atMostOneContext, {
    message: 'A medical record may have an appointment or an admission, not both.',
    path: ['admissionId'],
  })

export const medicalRecordIdParamsSchema = z
  .object({ id: z.string().uuid() })
  .strict()

export const listMedicalRecordsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    patientId: z.string().uuid().optional(),
    authorEmployeeId: z.string().uuid().optional(),
    status: z.enum(MEDICAL_RECORD_STATUSES).optional(),
    occurredAtFrom: instantSchema.optional(),
    occurredAtTo: instantSchema.optional(),
    sortBy: z.enum(MEDICAL_RECORD_SORT_FIELDS).default('occurredAt'),
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

export type CreateMedicalRecordBody = z.infer<typeof createMedicalRecordBodySchema>
export type UpdateMedicalRecordBody = z.infer<typeof updateMedicalRecordBodySchema>
export type AmendMedicalRecordBody = z.infer<typeof amendMedicalRecordBodySchema>
export type ListMedicalRecordsQuery = z.infer<typeof listMedicalRecordsQuerySchema>

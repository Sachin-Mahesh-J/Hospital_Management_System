import { z } from 'zod'

export const PATIENT_STATUSES = ['active', 'inactive', 'deceased'] as const
export const PATIENT_SEX_VALUES = [
  'female',
  'male',
  'intersex',
  'unknown',
  'not_disclosed',
] as const
export const DOB_PRECISIONS = ['exact', 'month', 'year', 'unknown'] as const
export const PATIENT_SORT_FIELDS = [
  'patientNumber',
  'firstName',
  'lastName',
  'dateOfBirth',
  'status',
  'createdAt',
] as const

const optionalText = (maximum: number) =>
  z.string().trim().min(1).max(maximum).nullable().optional()

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be a valid date in YYYY-MM-DD format.')
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`)
    return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().startsWith(value)
  }, 'Must be a valid calendar date.')
  .refine(
    (value) => new Date(`${value}T00:00:00.000Z`) <= new Date(),
    'Date of birth cannot be in the future.',
  )

const patientFields = {
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  dateOfBirth: dateOnlySchema.nullable(),
  dateOfBirthPrecision: z.enum(DOB_PRECISIONS),
  sexAtRegistration: z.enum(PATIENT_SEX_VALUES).nullable().optional(),
  phone: optionalText(30),
  email: z.string().trim().email().max(254).nullable().optional(),
  addressText: optionalText(2000),
  emergencyContactName: optionalText(200),
  emergencyContactPhone: optionalText(30),
}

function validDobPrecision(input: {
  dateOfBirth?: string | null | undefined
  dateOfBirthPrecision?: (typeof DOB_PRECISIONS)[number] | undefined
}): boolean {
  const { dateOfBirth, dateOfBirthPrecision } = input
  if (dateOfBirthPrecision === undefined) return dateOfBirth === undefined
  if (dateOfBirthPrecision === 'unknown') return dateOfBirth === null
  if (!dateOfBirth) return false
  if (dateOfBirthPrecision === 'month') return dateOfBirth.endsWith('-01')
  if (dateOfBirthPrecision === 'year') return dateOfBirth.endsWith('-01-01')
  return true
}

export const createPatientBodySchema = z
  .object(patientFields)
  .strict()
  .refine(validDobPrecision, {
    message: 'Date of birth is inconsistent with its precision.',
    path: ['dateOfBirth'],
  })

export const updatePatientBodySchema = z
  .object({
    firstName: patientFields.firstName.optional(),
    lastName: patientFields.lastName.optional(),
    dateOfBirth: patientFields.dateOfBirth.optional(),
    dateOfBirthPrecision: patientFields.dateOfBirthPrecision.optional(),
    sexAtRegistration: patientFields.sexAtRegistration,
    phone: patientFields.phone,
    email: patientFields.email,
    addressText: patientFields.addressText,
    emergencyContactName: patientFields.emergencyContactName,
    emergencyContactPhone: patientFields.emergencyContactPhone,
    status: z.enum(PATIENT_STATUSES).optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0, {
    message: 'At least one patient field must be supplied.',
  })
  .refine(
    (input) =>
      ('dateOfBirth' in input) === ('dateOfBirthPrecision' in input),
    {
      message: 'Date of birth and precision must be updated together.',
      path: ['dateOfBirth'],
    },
  )
  .refine(validDobPrecision, {
    message: 'Date of birth is inconsistent with its precision.',
    path: ['dateOfBirth'],
  })

export const patientIdParamsSchema = z
  .object({ id: z.string().uuid() })
  .strict()

export const listPatientsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(200).optional(),
    status: z.enum(PATIENT_STATUSES).optional(),
    sortBy: z.enum(PATIENT_SORT_FIELDS).default('lastName'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  })
  .strict()

export type CreatePatientBody = z.infer<typeof createPatientBodySchema>
export type UpdatePatientBody = z.infer<typeof updatePatientBodySchema>
export type ListPatientsQuery = z.infer<typeof listPatientsQuerySchema>

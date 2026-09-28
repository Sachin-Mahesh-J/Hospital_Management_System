import { z } from 'zod'

export const DOCTOR_STATUSES = ['active', 'inactive'] as const
export const DOCTOR_SORT_FIELDS = [
  'licenseNumber',
  'specialization',
  'status',
  'createdAt',
  'lastName',
  'firstName',
] as const

const optionalText = (maximum: number) =>
  z.string().trim().min(1).max(maximum).nullable().optional()

const doctorFields = {
  employeeId: z.string().uuid(),
  licenseNumber: z.string().trim().min(1).max(100),
  specialization: z.string().trim().min(1).max(150),
  professionalSummary: optionalText(5000),
  contactExtension: optionalText(20),
  status: z.enum(DOCTOR_STATUSES),
}

export const createDoctorBodySchema = z
  .object({
    employeeId: doctorFields.employeeId,
    licenseNumber: doctorFields.licenseNumber,
    specialization: doctorFields.specialization,
    professionalSummary: doctorFields.professionalSummary,
    contactExtension: doctorFields.contactExtension,
    status: doctorFields.status.optional(),
  })
  .strict()

export const updateDoctorBodySchema = z
  .object({
    licenseNumber: doctorFields.licenseNumber.optional(),
    specialization: doctorFields.specialization.optional(),
    professionalSummary: doctorFields.professionalSummary,
    contactExtension: doctorFields.contactExtension,
    status: doctorFields.status.optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0, {
    message: 'At least one doctor field must be supplied.',
  })

export const doctorIdParamsSchema = z
  .object({ id: z.string().uuid() })
  .strict()

export const listDoctorsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(200).optional(),
    status: z.enum(DOCTOR_STATUSES).optional(),
    departmentId: z.string().uuid().optional(),
    employmentStatus: z
      .enum(['active', 'inactive', 'terminated'])
      .optional(),
    sortBy: z.enum(DOCTOR_SORT_FIELDS).default('lastName'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  })
  .strict()

export type CreateDoctorBody = z.infer<typeof createDoctorBodySchema>
export type UpdateDoctorBody = z.infer<typeof updateDoctorBodySchema>
export type ListDoctorsQuery = z.infer<typeof listDoctorsQuerySchema>

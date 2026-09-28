import { z } from 'zod'

export const EMPLOYMENT_STATUSES = [
  'active',
  'inactive',
  'terminated',
] as const
export const EMPLOYEE_SORT_FIELDS = [
  'employeeNumber',
  'firstName',
  'lastName',
  'hireDate',
  'employmentStatus',
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

function validEmploymentDates(input: {
  hireDate?: string | undefined
  endDate?: string | null | undefined
}): boolean {
  if (input.hireDate === undefined || input.endDate === undefined) return true
  if (input.endDate === null) return true
  return input.endDate >= input.hireDate
}

const employeeFields = {
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  phone: optionalText(30),
  email: z.string().trim().email().max(254).nullable().optional(),
  jobTitle: z.string().trim().min(1).max(100),
  departmentId: z.string().uuid(),
  userId: z.string().uuid().nullable().optional(),
  employmentStatus: z.enum(EMPLOYMENT_STATUSES),
  hireDate: dateOnlySchema,
  endDate: dateOnlySchema.nullable().optional(),
}

export const createEmployeeBodySchema = z
  .object({
    firstName: employeeFields.firstName,
    lastName: employeeFields.lastName,
    phone: employeeFields.phone,
    email: employeeFields.email,
    jobTitle: employeeFields.jobTitle,
    departmentId: employeeFields.departmentId,
    userId: employeeFields.userId,
    employmentStatus: employeeFields.employmentStatus.optional(),
    hireDate: employeeFields.hireDate,
    endDate: employeeFields.endDate,
  })
  .strict()
  .refine(validEmploymentDates, {
    message: 'End date cannot be earlier than hire date.',
    path: ['endDate'],
  })

export const updateEmployeeBodySchema = z
  .object({
    firstName: employeeFields.firstName.optional(),
    lastName: employeeFields.lastName.optional(),
    phone: employeeFields.phone,
    email: employeeFields.email,
    jobTitle: employeeFields.jobTitle.optional(),
    departmentId: employeeFields.departmentId.optional(),
    userId: employeeFields.userId,
    employmentStatus: employeeFields.employmentStatus.optional(),
    hireDate: employeeFields.hireDate.optional(),
    endDate: employeeFields.endDate,
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0, {
    message: 'At least one employee field must be supplied.',
  })
  .refine(validEmploymentDates, {
    message: 'End date cannot be earlier than hire date.',
    path: ['endDate'],
  })

export const employeeIdParamsSchema = z
  .object({ id: z.string().uuid() })
  .strict()

export const listEmployeesQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(200).optional(),
    departmentId: z.string().uuid().optional(),
    employmentStatus: z.enum(EMPLOYMENT_STATUSES).optional(),
    hasDoctorProfile: z.enum(['true', 'false']).optional(),
    sortBy: z.enum(EMPLOYEE_SORT_FIELDS).default('lastName'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  })
  .strict()

export type CreateEmployeeBody = z.infer<typeof createEmployeeBodySchema>
export type UpdateEmployeeBody = z.infer<typeof updateEmployeeBodySchema>
export type ListEmployeesQuery = z.infer<typeof listEmployeesQuerySchema>

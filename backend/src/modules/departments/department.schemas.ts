import { z } from 'zod'

export const DEPARTMENT_STATUSES = ['active', 'inactive'] as const
export const DEPARTMENT_SORT_FIELDS = [
  'code',
  'name',
  'status',
  'createdAt',
] as const

const optionalText = (maximum: number) =>
  z.string().trim().min(1).max(maximum).nullable().optional()

const departmentFields = {
  code: z.string().trim().min(1).max(30),
  name: z.string().trim().min(1).max(150),
  description: optionalText(2000),
  status: z.enum(DEPARTMENT_STATUSES),
}

export const createDepartmentBodySchema = z
  .object({
    code: departmentFields.code,
    name: departmentFields.name,
    description: departmentFields.description,
    status: departmentFields.status.optional(),
  })
  .strict()

export const updateDepartmentBodySchema = z
  .object({
    code: departmentFields.code.optional(),
    name: departmentFields.name.optional(),
    description: departmentFields.description,
    status: departmentFields.status.optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0, {
    message: 'At least one department field must be supplied.',
  })

export const departmentIdParamsSchema = z
  .object({ id: z.string().uuid() })
  .strict()

export const listDepartmentsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(200).optional(),
    status: z.enum(DEPARTMENT_STATUSES).optional(),
    sortBy: z.enum(DEPARTMENT_SORT_FIELDS).default('name'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  })
  .strict()

export type CreateDepartmentBody = z.infer<typeof createDepartmentBodySchema>
export type UpdateDepartmentBody = z.infer<typeof updateDepartmentBodySchema>
export type ListDepartmentsQuery = z.infer<typeof listDepartmentsQuerySchema>

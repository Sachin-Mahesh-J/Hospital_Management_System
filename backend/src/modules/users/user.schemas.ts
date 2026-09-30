import { z } from 'zod'
import { SYSTEM_ROLES } from '../../auth/roleCatalog.js'
import {
  PASSWORD_MAX_LENGTH,
  validatePasswordPolicy,
} from '../../auth/password.service.js'

export const USER_STATUSES = ['active', 'disabled'] as const
export const USER_SORT_FIELDS = ['username', 'status', 'createdAt'] as const
export const SYSTEM_ROLE_CODES = [
  'administrator',
  'doctor',
  'nurse',
  'receptionist',
  'laboratory_staff',
  'pharmacist',
  'accountant',
] as const satisfies ReadonlyArray<(typeof SYSTEM_ROLES)[number][0]>

const passwordSchema = z
  .string()
  .max(PASSWORD_MAX_LENGTH)
  .refine(validatePasswordPolicy, 'The password does not meet policy.')

export const createUserBodySchema = z
  .object({
    username: z.string().trim().min(1).max(100),
    password: passwordSchema,
    roleCode: z.enum(SYSTEM_ROLE_CODES),
    status: z.enum(USER_STATUSES).optional(),
    employeeId: z.string().uuid().nullable().optional(),
  })
  .strict()

export const updateUserBodySchema = z
  .object({
    username: z.string().trim().min(1).max(100).optional(),
    employeeId: z.string().uuid().nullable().optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0, {
    message: 'At least one user field must be supplied.',
  })

export const changeUserRoleBodySchema = z
  .object({
    roleCode: z.enum(SYSTEM_ROLE_CODES),
  })
  .strict()

export const resetUserPasswordBodySchema = z
  .object({
    newPassword: passwordSchema,
  })
  .strict()

export const userIdParamsSchema = z
  .object({ id: z.string().uuid() })
  .strict()

export const listUsersQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(200).optional(),
    status: z.enum(USER_STATUSES).optional(),
    roleCode: z.enum(SYSTEM_ROLE_CODES).optional(),
    sortBy: z.enum(USER_SORT_FIELDS).default('username'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  })
  .strict()

export type CreateUserBody = z.infer<typeof createUserBodySchema>
export type UpdateUserBody = z.infer<typeof updateUserBodySchema>
export type ChangeUserRoleBody = z.infer<typeof changeUserRoleBodySchema>
export type ResetUserPasswordBody = z.infer<typeof resetUserPasswordBodySchema>
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>

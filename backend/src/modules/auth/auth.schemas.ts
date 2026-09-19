import { z } from 'zod'
import {
  PASSWORD_MAX_LENGTH,
  validatePasswordPolicy,
} from '../../auth/password.service.js'

export const loginBodySchema = z
  .object({
    username: z.string().trim().min(1).max(100),
    password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
  })
  .strict()

export const changePasswordBodySchema = z
  .object({
    currentPassword: z.string().min(1).max(PASSWORD_MAX_LENGTH),
    newPassword: z
      .string()
      .max(PASSWORD_MAX_LENGTH)
      .refine(validatePasswordPolicy, 'The new password does not meet policy.'),
  })
  .strict()

export type LoginBody = z.infer<typeof loginBodySchema>
export type ChangePasswordBody = z.infer<typeof changePasswordBodySchema>

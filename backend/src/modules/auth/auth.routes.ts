import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { PERMISSIONS } from '../../auth/auth.constants.js'
import { env } from '../../config/env.js'
import { AppError } from '../../errors/AppError.js'
import { requirePermission } from '../../middleware/accessControl.js'
import { authenticate } from '../../middleware/authenticate.js'
import { requireCookieCsrfProtection } from '../../middleware/csrfProtection.js'
import { validate } from '../../middleware/validate.js'
import {
  changePasswordController,
  currentUserController,
  loginController,
  logoutController,
  refreshController,
} from './auth.controller.js'
import {
  changePasswordBodySchema,
  loginBodySchema,
} from './auth.schemas.js'

function authRateLimit(max: number) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: max,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => env.nodeEnv === 'test',
    handler: (_request, _response, next) => {
      next(
        new AppError(
          429,
          'AUTH_RATE_LIMITED',
          'Too many authentication attempts. Try again later.',
        ),
      )
    },
  })
}

export const authRouter = Router()

authRouter.post(
  '/login',
  authRateLimit(20),
  requireCookieCsrfProtection,
  validate({ body: loginBodySchema }),
  loginController,
)
authRouter.post(
  '/refresh',
  authRateLimit(60),
  requireCookieCsrfProtection,
  refreshController,
)
authRouter.post(
  '/logout',
  requireCookieCsrfProtection,
  logoutController,
)
authRouter.get(
  '/me',
  authenticate,
  requirePermission(PERMISSIONS.identitySelfRead),
  currentUserController,
)
authRouter.post(
  '/change-password',
  authRateLimit(10),
  authenticate,
  requirePermission(PERMISSIONS.identityPasswordChange),
  validate({ body: changePasswordBodySchema }),
  changePasswordController,
)

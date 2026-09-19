import type { RequestHandler } from 'express'
import {
  AUTH_CSRF_HEADER,
  AUTH_CSRF_VALUE,
} from '../auth/auth.constants.js'
import { env } from '../config/env.js'
import { AuthorizationError } from '../errors/httpErrors.js'

export const requireCookieCsrfProtection: RequestHandler = (
  request,
  _response,
  next,
) => {
  const origin = request.header('origin')
  const csrfHeader = request.header(AUTH_CSRF_HEADER)

  if (
    !origin ||
    !env.cors.allowedOrigins.includes(origin) ||
    csrfHeader !== AUTH_CSRF_VALUE
  ) {
    next(new AuthorizationError('The request origin could not be verified.'))
    return
  }

  next()
}

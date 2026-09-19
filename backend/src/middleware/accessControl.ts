import type { RequestHandler } from 'express'
import {
  AuthenticationError,
  AuthorizationError,
} from '../errors/httpErrors.js'

export const requireAuthentication: RequestHandler = (
  _request,
  response,
  next,
) => {
  if (!response.locals.currentUser) {
    next(new AuthenticationError())
    return
  }

  next()
}

export function requireAnyRole(...roles: readonly string[]): RequestHandler {
  return (_request, response, next) => {
    const currentUser = response.locals.currentUser

    if (!currentUser) {
      next(new AuthenticationError())
      return
    }

    if (!roles.some((role) => currentUser.roles.includes(role))) {
      next(new AuthorizationError())
      return
    }

    next()
  }
}

export function requirePermission(permission: string): RequestHandler {
  return (_request, response, next) => {
    const currentUser = response.locals.currentUser

    if (!currentUser) {
      next(new AuthenticationError())
      return
    }

    if (!currentUser.permissions.includes(permission)) {
      next(new AuthorizationError())
      return
    }

    next()
  }
}

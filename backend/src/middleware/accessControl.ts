import type { RequestHandler, Response } from 'express'
import {
  AuthenticationError,
  AuthorizationError,
} from '../errors/httpErrors.js'
import { logger } from '../config/logger.js'
import { writeAudit } from '../modules/audit/audit.service.js'

async function auditDenial(
  response: Response,
  metadata: { permission?: string; roles?: string },
): Promise<void> {
  try {
    await writeAudit({
      actorUserId: response.locals.currentUser!.id,
      action: 'authorization.denied',
      resourceType: 'api_request',
      outcome: 'denied',
      requestId: response.locals.requestId,
      metadata,
    })
  } catch (error) {
    logger.error(
      { error, requestId: response.locals.requestId },
      'Failed to persist authorization denial audit',
    )
  }
}

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
  return async (_request, response, next) => {
    const currentUser = response.locals.currentUser

    if (!currentUser) {
      next(new AuthenticationError())
      return
    }

    if (!roles.some((role) => currentUser.roles.includes(role))) {
      await auditDenial(response, { roles: roles.join(',') })
      next(new AuthorizationError())
      return
    }

    next()
  }
}

export function requirePermission(permission: string): RequestHandler {
  return async (_request, response, next) => {
    const currentUser = response.locals.currentUser

    if (!currentUser) {
      next(new AuthenticationError())
      return
    }

    if (!currentUser.permissions.includes(permission)) {
      await auditDenial(response, { permission })
      next(new AuthorizationError())
      return
    }

    next()
  }
}

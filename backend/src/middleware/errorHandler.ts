import { Prisma } from '@prisma/client'
import type { ErrorRequestHandler, RequestHandler } from 'express'
import { ZodError } from 'zod'
import { AppError } from '../errors/AppError.js'
import { logger } from '../config/logger.js'
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../errors/httpErrors.js'

export const notFoundHandler: RequestHandler = (_request, response) => {
  response.status(404).json({
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: 'The requested resource was not found.',
      requestId: response.locals.requestId,
    },
  })
}

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _request,
  response,
  next,
) => {
  if (response.headersSent) {
    next(error)
    return
  }

  let safeError: AppError | null = null

  if (error instanceof AppError) {
    safeError = error
  } else if (error instanceof ZodError) {
    safeError = new ValidationError(
      'The request is invalid.',
      error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    )
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      safeError = new ConflictError()
    } else if (error.code === 'P2025') {
      safeError = new NotFoundError()
    }
  }

  if (!safeError) {
    logger.error(
      { error, requestId: response.locals.requestId },
      'Unhandled request error',
    )
    safeError = new AppError(
      500,
      'INTERNAL_SERVER_ERROR',
      'An unexpected error occurred.',
    )
  } else if (safeError.status >= 500) {
    logger.error(
      { error, requestId: response.locals.requestId },
      'Request failed',
    )
  }

  const responseError: {
    code: string
    message: string
    requestId: string
    fields?: readonly { path: string; message: string }[]
  } = {
    code: safeError.code,
    message: safeError.message,
    requestId: response.locals.requestId,
  }

  if (safeError.fields?.length) {
    responseError.fields = safeError.fields
  }

  response.status(safeError.status).json({
    error: {
      ...responseError,
    },
  })
}

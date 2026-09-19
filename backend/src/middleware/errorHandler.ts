import type { ErrorRequestHandler, RequestHandler } from 'express'
import { AppError } from '../errors/AppError.js'
import { logger } from '../config/logger.js'

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
  _next,
) => {
  if (error instanceof AppError) {
    response.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
        requestId: response.locals.requestId,
      },
    })
    return
  }

  logger.error(
    { error, requestId: response.locals.requestId },
    'Unhandled request error',
  )
  response.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred.',
      requestId: response.locals.requestId,
    },
  })
}

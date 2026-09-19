import type { RequestHandler } from 'express'
import type { ZodType } from 'zod'
import { AppError } from '../errors/AppError.js'

type RequestSchemas = {
  body?: ZodType
  params?: ZodType
  query?: ZodType
}

export function validate(schemas: RequestSchemas): RequestHandler {
  return (request, _response, next) => {
    const inputs = [
      ['body', schemas.body, request.body],
      ['params', schemas.params, request.params],
      ['query', schemas.query, request.query],
    ] as const

    for (const [location, schema, input] of inputs) {
      if (!schema) {
        continue
      }

      const result = schema.safeParse(input)

      if (!result.success) {
        next(
          new AppError(
            400,
            'VALIDATION_ERROR',
            `Invalid request ${location}.`,
          ),
        )
        return
      }
    }

    next()
  }
}

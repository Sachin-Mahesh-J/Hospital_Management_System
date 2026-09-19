import type { RequestHandler } from 'express'
import type { ZodType } from 'zod'
import { ValidationError } from '../errors/httpErrors.js'

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
          new ValidationError(
            `Invalid request ${location}.`,
            result.error.issues.map((issue) => ({
              path: [location, ...issue.path].join('.'),
              message: issue.message,
            })),
          ),
        )
        return
      }
    }

    next()
  }
}

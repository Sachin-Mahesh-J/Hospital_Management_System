import { randomUUID } from 'node:crypto'
import type { RequestHandler } from 'express'

export const requestContext: RequestHandler = (request, response, next) => {
  const suppliedId = request.header('x-request-id')
  const requestId =
    suppliedId && /^[A-Za-z0-9._:-]{1,128}$/.test(suppliedId)
      ? suppliedId
      : randomUUID()

  response.locals.requestId = requestId
  response.setHeader('x-request-id', requestId)
  next()
}

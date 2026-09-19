import { randomUUID } from 'node:crypto'
import type { RequestHandler } from 'express'

export const requestContext: RequestHandler = (request, response, next) => {
  const suppliedId = request.header('x-request-id')
  const requestId =
    suppliedId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      suppliedId,
    )
      ? suppliedId
      : randomUUID()

  response.locals.requestId = requestId
  response.setHeader('x-request-id', requestId)
  next()
}

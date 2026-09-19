import { Prisma } from '@prisma/client'
import express from 'express'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import {
  requireAuthentication,
  requirePermission,
} from '../src/middleware/accessControl.js'
import {
  errorHandler,
  notFoundHandler,
} from '../src/middleware/errorHandler.js'
import { requestContext } from '../src/middleware/requestContext.js'

vi.mock('../src/modules/audit/audit.service.js', () => ({
  writeAudit: vi.fn().mockResolvedValue(undefined),
}))

function createErrorTestApp() {
  const app = express()
  app.use(requestContext)
  app.get('/unexpected', () => {
    throw new Error('database password must not escape')
  })
  app.get('/conflict', () => {
    throw new Prisma.PrismaClientKnownRequestError('internal constraint', {
      code: 'P2002',
      clientVersion: 'test',
    })
  })
  app.get('/protected', requireAuthentication, (_request, response) => {
    response.sendStatus(204)
  })
  app.get(
    '/permission',
    (_request, response, next) => {
      response.locals.currentUser = {
        id: 'test-user',
        username: 'test-user',
        roles: [],
        permissions: [],
      }
      next()
    },
    requirePermission('future:permission'),
    (_request, response) => response.sendStatus(204),
  )
  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
}

const app = createErrorTestApp()

describe('central error handling', () => {
  it('returns a generic response for unknown errors', async () => {
    const response = await request(app).get('/unexpected').expect(500)

    expect(response.body.error).toMatchObject({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred.',
      requestId: expect.any(String),
    })
    expect(response.text).not.toContain('database password')
    expect(response.text).not.toContain('stack')
  })

  it('maps known Prisma conflicts without exposing internals', async () => {
    const response = await request(app).get('/conflict').expect(409)

    expect(response.body.error.code).toBe('RESOURCE_CONFLICT')
    expect(response.text).not.toContain('constraint')
    expect(response.text).not.toContain('P2002')
  })

  it('provides authentication and authorization extension points', async () => {
    const unauthenticated = await request(app).get('/protected').expect(401)
    const unauthorized = await request(app).get('/permission').expect(403)

    expect(unauthenticated.body.error.code).toBe('AUTHENTICATION_REQUIRED')
    expect(unauthorized.body.error.code).toBe('FORBIDDEN')
  })
})

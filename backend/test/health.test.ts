import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'

const app = createApp()

describe('GET /api/v1/health', () => {
  it('returns process health and a request ID', async () => {
    const response = await request(app)
      .get('/api/v1/health')
      .set('x-request-id', 'test-request-id')
      .expect(200)

    expect(response.headers['x-request-id']).toBe('test-request-id')
    expect(response.body).toEqual({
      status: 'ok',
      service: 'hms-api',
      timestamp: expect.any(String),
    })
    expect(Date.parse(response.body.timestamp)).not.toBeNaN()
  })

  it('rejects unexpected query parameters through validation', async () => {
    const response = await request(app)
      .get('/api/v1/health?unexpected=true')
      .expect(400)

    expect(response.body).toMatchObject({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request query.',
        requestId: expect.any(String),
        fields: [
          {
            path: 'query',
            message: expect.any(String),
          },
        ],
      },
    })
  })

  it('replaces malformed request IDs', async () => {
    const response = await request(app)
      .get('/api/v1/health')
      .set('x-request-id', 'invalid request id')
      .expect(200)

    expect(response.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f-]{27}$/i,
    )
  })
})

describe('API infrastructure', () => {
  it('serves documentation for the implemented health contract', async () => {
    const specification = await request(app)
      .get('/api/v1/openapi.json')
      .expect(200)
    const documentation = await request(app).get('/api/docs/').expect(200)

    expect(specification.body.paths).toHaveProperty('/api/v1/health')
    expect(documentation.text).toContain('Swagger UI')
  })

  it('returns the safe error contract for unknown routes', async () => {
    const response = await request(app).get('/api/v1/unknown').expect(404)

    expect(response.body).toMatchObject({
      error: {
        code: 'ROUTE_NOT_FOUND',
        requestId: expect.any(String),
      },
    })
    expect(response.text).not.toContain('stack')
  })

  it('rejects an origin outside the configured CORS allowlist', async () => {
    const response = await request(app)
      .get('/api/v1/health')
      .set('Origin', 'https://untrusted.example')
      .expect(403)

    expect(response.body.error.code).toBe('ORIGIN_NOT_ALLOWED')
  })
})

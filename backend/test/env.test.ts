import { describe, expect, it } from 'vitest'
import { loadEnvironment } from '../src/config/env.js'

const validEnvironment = {
  NODE_ENV: 'development',
  PORT: '5000',
  DATABASE_URL:
    'postgresql://postgres:local@localhost:5432/hms_development?schema=public',
  ALLOWED_ORIGINS: 'http://localhost:5173, https://hms.example.com',
  LOG_LEVEL: 'info',
}

describe('environment configuration', () => {
  it('parses valid configuration into grouped settings', () => {
    const configuration = loadEnvironment(validEnvironment)

    expect(configuration.port).toBe(5000)
    expect(configuration.database.connectionUrl).toContain('hms_development')
    expect(configuration.cors.allowedOrigins).toEqual([
      'http://localhost:5173',
      'https://hms.example.com',
    ])
    expect(configuration.jwt).toBeNull()
  })

  it('uses only the isolated test URL in the test environment', () => {
    const configuration = loadEnvironment({
      ...validEnvironment,
      NODE_ENV: 'test',
      TEST_DATABASE_URL:
        'postgresql://postgres:local@localhost:5432/hms_test?schema=public',
    })

    expect(configuration.database.connectionUrl).toContain('/hms_test')
    expect(configuration.database.connectionUrl).not.toContain('/hms_development')
  })

  it('rejects missing test database configuration', () => {
    expect(() =>
      loadEnvironment({ ...validEnvironment, NODE_ENV: 'test' }),
    ).toThrow('TEST_DATABASE_URL')
  })

  it('rejects invalid URLs, wildcard CORS, and partial JWT configuration', () => {
    expect(() =>
      loadEnvironment({ ...validEnvironment, DATABASE_URL: 'not-a-url' }),
    ).toThrow('DATABASE_URL')
    expect(() =>
      loadEnvironment({ ...validEnvironment, ALLOWED_ORIGINS: '*' }),
    ).toThrow('ALLOWED_ORIGINS')
    expect(() =>
      loadEnvironment({
        ...validEnvironment,
        JWT_ACCESS_SECRET: 'a-secure-secret-with-at-least-32-characters',
      }),
    ).toThrow('JWT_ACCESS_SECRET')
  })
})

import { describe, expect, it } from 'vitest'
import { loadEnvironment } from '../src/config/env.js'

const validEnvironment = {
  NODE_ENV: 'development',
  PORT: '5000',
  DATABASE_URL:
    'postgresql://postgres:local@localhost:5432/hms_development?schema=public',
  ALLOWED_ORIGINS: 'http://localhost:5173, https://hms.example.com',
  LOG_LEVEL: 'info',
  JWT_ACCESS_SECRET: 'a-secure-secret-with-at-least-32-characters',
  JWT_ISSUER: 'hms-api',
  JWT_AUDIENCE: 'hms-web',
  HOSPITAL_TIMEZONE: 'Asia/Colombo',
  DEFAULT_CURRENCY: 'LKR',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SECRET_KEY: 'test-only-supabase-secret-key',
  SUPABASE_STORAGE_BUCKET: 'hms-patient-documents',
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
    expect(configuration.jwt.issuer).toBe('hms-api')
    expect(configuration.auth.cookieName).toBe('hms_refresh')
    expect(configuration.hospital.timezone).toBe('Asia/Colombo')
    expect(configuration.hospital.defaultCurrency).toBe('LKR')
    expect(configuration.storage.bucket).toBe('hms-patient-documents')
    expect(configuration.storage.secretKey).toBe('test-only-supabase-secret-key')
    expect(configuration.storage.signedUrlTtlSeconds).toBe(300)
    expect(configuration.storage.driver).toBe('supabase')
  })

  it('allows memory document storage only outside production', () => {
    const configuration = loadEnvironment({
      ...validEnvironment,
      DOCUMENT_STORAGE_DRIVER: 'memory',
    })
    expect(configuration.storage.driver).toBe('memory')
    expect(() =>
      loadEnvironment({
        ...validEnvironment,
        NODE_ENV: 'production',
        DOCUMENT_STORAGE_DRIVER: 'memory',
      }),
    ).toThrow('DOCUMENT_STORAGE_DRIVER')
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
    expect(configuration.storage.driver).toBe('memory')
  })

  it('rejects missing test database configuration', () => {
    expect(() =>
      loadEnvironment({ ...validEnvironment, NODE_ENV: 'test' }),
    ).toThrow('TEST_DATABASE_URL')
  })

  it('rejects invalid URLs, wildcard CORS, and missing JWT configuration', () => {
    expect(() =>
      loadEnvironment({ ...validEnvironment, DATABASE_URL: 'not-a-url' }),
    ).toThrow('DATABASE_URL')
    expect(() =>
      loadEnvironment({ ...validEnvironment, ALLOWED_ORIGINS: '*' }),
    ).toThrow('ALLOWED_ORIGINS')
    expect(() =>
      loadEnvironment({
        ...validEnvironment,
        HOSPITAL_TIMEZONE: 'Not/AZone',
      }),
    ).toThrow('HOSPITAL_TIMEZONE')
    expect(() =>
      loadEnvironment({
        ...validEnvironment,
        DEFAULT_CURRENCY: 'lkr',
      }),
    ).toThrow('DEFAULT_CURRENCY')
    expect(() =>
      loadEnvironment({ ...validEnvironment, SUPABASE_SECRET_KEY: '' }),
    ).toThrow('SUPABASE_SECRET_KEY')
  })
})

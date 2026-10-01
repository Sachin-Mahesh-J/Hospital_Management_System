import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  logRedactPaths,
  logStartupFailure,
  logger,
  serializeStartupError,
} from '../src/config/logger.js'

describe('logger redaction', () => {
  it('redacts laboratory clinical fields', () => {
    expect(logRedactPaths).toEqual(
      expect.arrayContaining([
        'req.body.clinicalNote',
        'req.body.resultValue',
        'req.body.resultNote',
        'req.body.referenceRangeSnapshot',
        '*.clinicalNote',
        '*.resultValue',
        '*.resultNote',
        '*.referenceRangeSnapshot',
        'req.body.note',
        'req.body.reason',
        'req.body.cardNumber',
        'req.body.cvv',
        'DATABASE_URL',
        'DIRECT_URL',
        'JWT_ACCESS_SECRET',
        'SUPABASE_SECRET_KEY',
      ]),
    )
  })
})

describe('startup failure logging', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('serializes Prisma-like startup errors without connection secrets', () => {
    const error = new Error(
      "Can't reach database server at `db.example.internal:5432`. Tried postgresql://hms:supersecret@db.example.internal:5432/hms",
    )
    error.name = 'PrismaClientInitializationError'
    Object.assign(error, {
      errorCode: 'P1001',
      clientVersion: '6.12.0',
      DATABASE_URL: 'postgresql://hms:supersecret@db.example.internal:5432/hms',
      JWT_ACCESS_SECRET: 'a-secure-secret-with-at-least-32-characters',
      SUPABASE_SECRET_KEY: 'test-only-supabase-secret-key',
    })

    const serialized = serializeStartupError(error)

    expect(serialized).toEqual({
      name: 'PrismaClientInitializationError',
      message: expect.stringContaining("Can't reach database server at `db.example.internal:5432`"),
      stack: expect.any(String),
      errorCode: 'P1001',
      clientVersion: '6.12.0',
    })
    expect(JSON.stringify(serialized)).not.toContain('supersecret')
    expect(JSON.stringify(serialized)).not.toMatch(/postgres(?:ql)?:\/\//i)
    expect(serialized).not.toHaveProperty('DATABASE_URL')
    expect(serialized).not.toHaveProperty('JWT_ACCESS_SECRET')
    expect(serialized).not.toHaveProperty('SUPABASE_SECRET_KEY')
  })

  it('includes Node listen error codes', () => {
    const error = Object.assign(new Error('listen EADDRINUSE'), {
      code: 'EADDRINUSE',
    })

    expect(serializeStartupError(error)).toMatchObject({
      name: 'Error',
      message: 'listen EADDRINUSE',
      code: 'EADDRINUSE',
    })
  })

  it('logs enumerable startup details in the fatal message', () => {
    const fatal = vi.spyOn(logger, 'fatal')
    const error = Object.assign(new Error("Can't reach database server at `db.example.internal:5432`"), {
      name: 'PrismaClientInitializationError',
      errorCode: 'P1001',
    })

    logStartupFailure(error)

    expect(fatal).toHaveBeenCalledWith(
      {
        startupError: expect.objectContaining({
          name: 'PrismaClientInitializationError',
          message: "Can't reach database server at `db.example.internal:5432`",
          errorCode: 'P1001',
        }),
      },
      "HMS API failed to start: PrismaClientInitializationError: Can't reach database server at `db.example.internal:5432`",
    )
  })
})

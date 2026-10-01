import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  formatStartupFailureMessage,
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
    const cause = Object.assign(new Error('connect ECONNREFUSED'), {
      code: 'ECONNREFUSED',
      syscall: 'connect',
    })
    const error = new Error(
      "Can't reach database server at `db.example.internal:5432`. Tried postgresql://hms:supersecret@db.example.internal:5432/hms",
      { cause },
    )
    error.name = 'PrismaClientInitializationError'
    Object.assign(error, {
      startupPhase: 'database_connect',
      errorCode: 'P1001',
      clientVersion: '6.12.0',
      DATABASE_URL: 'postgresql://hms:supersecret@db.example.internal:5432/hms',
      JWT_ACCESS_SECRET: 'a-secure-secret-with-at-least-32-characters',
      SUPABASE_SECRET_KEY: 'test-only-supabase-secret-key',
    })

    const serialized = serializeStartupError(error)
    const rendered = formatStartupFailureMessage(serialized)

    expect(serialized).toEqual({
      name: 'PrismaClientInitializationError',
      message: expect.stringContaining("Can't reach database server at `db.example.internal:5432`"),
      phase: 'database_connect',
      stack: expect.any(String),
      code: 'ECONNREFUSED',
      errorCode: 'P1001',
      clientVersion: '6.12.0',
      syscall: 'connect',
      driver: 'postgresql',
    })
    expect(rendered).toContain('phase=database_connect')
    expect(rendered).toContain('errorCode=P1001')
    expect(rendered).toContain('code=ECONNREFUSED')
    expect(JSON.stringify(serialized)).not.toContain('supersecret')
    expect(JSON.stringify(serialized)).not.toMatch(/postgres(?:ql)?:\/\//i)
    expect(rendered).not.toContain('supersecret')
    expect(serialized).not.toHaveProperty('DATABASE_URL')
    expect(serialized).not.toHaveProperty('JWT_ACCESS_SECRET')
    expect(serialized).not.toHaveProperty('SUPABASE_SECRET_KEY')
  })

  it('includes Node listen error codes', () => {
    const error = Object.assign(new Error('listen EADDRINUSE'), {
      code: 'EADDRINUSE',
      startupPhase: 'listen',
    })

    expect(serializeStartupError(error)).toMatchObject({
      name: 'Error',
      message: 'listen EADDRINUSE',
      phase: 'listen',
      code: 'EADDRINUSE',
      driver: 'postgresql',
    })
  })

  it('logs enumerable startup details in the fatal message and stderr', () => {
    const fatal = vi.spyOn(logger, 'fatal')
    const flush = vi.spyOn(logger, 'flush')
    const stderr = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const error = Object.assign(
      new Error("Can't reach database server at `db.example.internal:5432`"),
      {
        name: 'PrismaClientInitializationError',
        errorCode: 'P1001',
        startupPhase: 'database_connect',
      },
    )

    logStartupFailure(error)

    const expectedMessage =
      "HMS API failed to start | phase=database_connect | name=PrismaClientInitializationError | message=Can't reach database server at `db.example.internal:5432` | driver=postgresql | errorCode=P1001"

    expect(fatal).toHaveBeenCalledWith(
      {
        startupError: expect.objectContaining({
          name: 'PrismaClientInitializationError',
          message: "Can't reach database server at `db.example.internal:5432`",
          phase: 'database_connect',
          errorCode: 'P1001',
        }),
      },
      expectedMessage,
    )
    expect(stderr).toHaveBeenCalledWith(expectedMessage)
    expect(flush).toHaveBeenCalled()
  })
})

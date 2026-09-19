import { z } from 'zod'

const logLevelSchema = z.enum([
  'fatal',
  'error',
  'warn',
  'info',
  'debug',
  'trace',
  'silent',
])

const databaseUrlSchema = z.string().refine((value) => {
  try {
    return ['postgres:', 'postgresql:'].includes(new URL(value).protocol)
  } catch {
    return false
  }
}, 'must be a PostgreSQL URL')

const environmentSchema = z
  .object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().max(65_535).default(5000),
  DATABASE_URL: databaseUrlSchema,
  TEST_DATABASE_URL: databaseUrlSchema.optional(),
  ALLOWED_ORIGINS: z.string().min(1),
  LOG_LEVEL: logLevelSchema.default('info'),
  JWT_ACCESS_SECRET: z.string().min(32).optional(),
  JWT_ISSUER: z.string().min(1).optional(),
  JWT_AUDIENCE: z.string().min(1).optional(),
  })
  .superRefine((value, context) => {
    const jwtValues = [
      value.JWT_ACCESS_SECRET,
      value.JWT_ISSUER,
      value.JWT_AUDIENCE,
    ]
    const configuredJwtValues = jwtValues.filter(Boolean).length

    if (configuredJwtValues > 0 && configuredJwtValues < jwtValues.length) {
      context.addIssue({
        code: 'custom',
        path: ['JWT_ACCESS_SECRET'],
        message: 'JWT configuration must be provided as a complete set',
      })
    }

    if (value.NODE_ENV === 'test' && !value.TEST_DATABASE_URL) {
      context.addIssue({
        code: 'custom',
        path: ['TEST_DATABASE_URL'],
        message: 'is required when NODE_ENV is test',
      })
    }
  })

export type AppConfig = {
  nodeEnv: 'development' | 'test' | 'production'
  port: number
  database: {
    url: string
    testUrl: string | null
    connectionUrl: string
  }
  cors: {
    allowedOrigins: readonly string[]
  }
  logging: {
    level: z.infer<typeof logLevelSchema>
  }
  jwt: {
    accessSecret: string
    issuer: string
    audience: string
  } | null
}

function parseAllowedOrigins(value: string): string[] {
  const origins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

  if (origins.length === 0 || origins.some((origin) => origin === '*')) {
    throw new Error('Invalid environment configuration: ALLOWED_ORIGINS')
  }

  try {
    return origins.map((origin) => new URL(origin).origin)
  } catch {
    throw new Error('Invalid environment configuration: ALLOWED_ORIGINS')
  }
}

export function loadEnvironment(
  source: NodeJS.ProcessEnv = process.env,
): AppConfig {
  const result = environmentSchema.safeParse(source)

  if (!result.success) {
    const variables = [
      ...new Set(result.error.issues.map((issue) => issue.path.join('.'))),
    ].join(', ')
    throw new Error(`Invalid environment configuration: ${variables}`)
  }

  const allowedOrigins = parseAllowedOrigins(result.data.ALLOWED_ORIGINS)
  const testUrl = result.data.TEST_DATABASE_URL ?? null
  const jwt =
    result.data.JWT_ACCESS_SECRET &&
    result.data.JWT_ISSUER &&
    result.data.JWT_AUDIENCE
      ? {
          accessSecret: result.data.JWT_ACCESS_SECRET,
          issuer: result.data.JWT_ISSUER,
          audience: result.data.JWT_AUDIENCE,
        }
      : null

  return {
    nodeEnv: result.data.NODE_ENV,
    port: result.data.PORT,
    database: {
      url: result.data.DATABASE_URL,
      testUrl,
      connectionUrl:
        result.data.NODE_ENV === 'test' ? testUrl! : result.data.DATABASE_URL,
    },
    cors: { allowedOrigins },
    logging: { level: result.data.LOG_LEVEL },
    jwt,
  }
}

export const env = loadEnvironment()

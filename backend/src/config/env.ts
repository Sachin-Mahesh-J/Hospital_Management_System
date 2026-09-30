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
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ISSUER: z.string().min(1),
  JWT_AUDIENCE: z.string().min(1),
  AUTH_COOKIE_NAME: z
    .string()
    .regex(/^[A-Za-z0-9_-]+$/)
    .default('hms_refresh'),
  AUTH_COOKIE_DOMAIN: z.string().min(1).optional(),
  TRUST_PROXY: z.enum(['true', 'false']).default('false'),
  HOSPITAL_TIMEZONE: z
    .string()
    .min(1)
    .refine((value) => {
      try {
        Intl.DateTimeFormat('en-US', { timeZone: value })
        return true
      } catch {
        return false
      }
    }, 'must be a valid IANA time zone'),
  DEFAULT_CURRENCY: z
    .string()
    .regex(/^[A-Z]{3}$/, 'must be a 3-letter ISO 4217 currency code'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(16),
  SUPABASE_STORAGE_BUCKET: z.string().min(1).max(100),
  DOCUMENT_SIGNED_URL_TTL_SECONDS: z.coerce
    .number()
    .int()
    .min(30)
    .max(900)
    .default(300),
  DOCUMENT_STORAGE_DRIVER: z.enum(['supabase', 'memory']).default('supabase'),
  })
  .superRefine((value, context) => {
    if (value.NODE_ENV === 'test' && !value.TEST_DATABASE_URL) {
      context.addIssue({
        code: 'custom',
        path: ['TEST_DATABASE_URL'],
        message: 'is required when NODE_ENV is test',
      })
    }
    if (
      value.DOCUMENT_STORAGE_DRIVER === 'memory' &&
      value.NODE_ENV === 'production'
    ) {
      context.addIssue({
        code: 'custom',
        path: ['DOCUMENT_STORAGE_DRIVER'],
        message: 'memory storage is not allowed in production',
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
  }
  auth: {
    cookieName: string
    cookieDomain: string | null
    trustProxy: boolean
  }
  hospital: {
    timezone: string
    defaultCurrency: string
  }
  storage: {
    driver: 'supabase' | 'memory'
    supabaseUrl: string
    serviceRoleKey: string
    bucket: string
    signedUrlTtlSeconds: number
  }
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
    jwt: {
      accessSecret: result.data.JWT_ACCESS_SECRET,
      issuer: result.data.JWT_ISSUER,
      audience: result.data.JWT_AUDIENCE,
    },
    auth: {
      cookieName: result.data.AUTH_COOKIE_NAME,
      cookieDomain: result.data.AUTH_COOKIE_DOMAIN ?? null,
      trustProxy: result.data.TRUST_PROXY === 'true',
    },
    hospital: {
      timezone: result.data.HOSPITAL_TIMEZONE,
      defaultCurrency: result.data.DEFAULT_CURRENCY,
    },
    storage: {
      driver:
        result.data.NODE_ENV === 'test'
          ? 'memory'
          : result.data.DOCUMENT_STORAGE_DRIVER,
      supabaseUrl: result.data.SUPABASE_URL,
      serviceRoleKey: result.data.SUPABASE_SERVICE_ROLE_KEY,
      bucket: result.data.SUPABASE_STORAGE_BUCKET,
      signedUrlTtlSeconds: result.data.DOCUMENT_SIGNED_URL_TTL_SECONDS,
    },
  }
}

export const env = loadEnvironment()

import { z } from 'zod'

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().max(65_535).default(5000),
  ALLOWED_ORIGINS: z.string().min(1),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
})

const result = environmentSchema.safeParse(process.env)

if (!result.success) {
  const variables = result.error.issues
    .map((issue) => issue.path.join('.'))
    .join(', ')
  throw new Error(`Invalid environment configuration: ${variables}`)
}

export const env = {
  nodeEnv: result.data.NODE_ENV,
  port: result.data.PORT,
  allowedOrigins: result.data.ALLOWED_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  logLevel: result.data.LOG_LEVEL,
} as const

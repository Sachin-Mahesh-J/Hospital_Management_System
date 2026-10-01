import pino from 'pino'
import { env } from './env.js'

export const logRedactPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.body.password',
  'req.body.currentPassword',
  'req.body.newPassword',
  'req.body.token',
  'req.body.refreshToken',
  'req.body.firstName',
  'req.body.lastName',
  'req.body.dateOfBirth',
  'req.body.phone',
  'req.body.email',
  'req.body.addressText',
  'req.body.emergencyContactName',
  'req.body.emergencyContactPhone',
  'req.body.diagnoses',
  'req.body.treatments',
  'req.body.reports',
  'req.body.items',
  'req.body.diagnosisText',
  'req.body.treatmentText',
  'req.body.reportText',
  'req.body.dosage',
  'req.body.instructions',
  'req.body.frequency',
  'req.body.duration',
  'req.body.clinicalNote',
  'req.body.resultValue',
  'req.body.resultNote',
  'req.body.referenceRangeSnapshot',
  'req.body.note',
  'req.body.reason',
  'req.body.cardNumber',
  'req.body.cvv',
  'req.body.pin',
  'req.body.card',
  'req.body.signedUrl',
  'req.body.secretKey',
  '*.secretKey',
  'DATABASE_URL',
  'DIRECT_URL',
  'JWT_ACCESS_SECRET',
  'SUPABASE_SECRET_KEY',
  '*.DATABASE_URL',
  '*.DIRECT_URL',
  '*.JWT_ACCESS_SECRET',
  '*.SUPABASE_SECRET_KEY',
  '*.signedUrl',
  '*.objectKey',
  '*.checksum',
  '*.diagnosisText',
  '*.treatmentText',
  '*.reportText',
  '*.dosage',
  '*.instructions',
  '*.clinicalNote',
  '*.resultValue',
  '*.resultNote',
  '*.referenceRangeSnapshot',
  '*.clinical_note',
  '*.result_value',
  '*.result_note',
  '*.reference_range_snapshot',
  'password',
  'currentPassword',
  'newPassword',
  'passwordHash',
  'token',
  'tokenHash',
  'accessToken',
  'refreshToken',
  '*.password',
  '*.currentPassword',
  '*.newPassword',
  '*.passwordHash',
  '*.token',
  '*.tokenHash',
  '*.accessToken',
  '*.refreshToken',
] as const

export const logger = pino({
  level: env.logging.level,
  base: {
    service: 'hms-api',
    environment: env.nodeEnv,
  },
  redact: {
    paths: [...logRedactPaths],
    censor: '[REDACTED]',
  },
})

const POSTGRES_CONNECTION_URL = /(?:postgres(?:ql)?):\/\/\S+/gi

export type StartupErrorLog = {
  name: string
  message: string
  stack?: string
  code?: string
  errorCode?: string
  clientVersion?: string
}

function redactConnectionUrls(value: string): string {
  return value.replace(POSTGRES_CONNECTION_URL, '[REDACTED]')
}

function readStringProperty(error: object, key: string): string | undefined {
  const value = (error as Record<string, unknown>)[key]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

export function serializeStartupError(error: unknown): StartupErrorLog {
  if (error instanceof Error) {
    const serialized: StartupErrorLog = {
      name: error.name || 'Error',
      message: redactConnectionUrls(error.message),
    }

    if (error.stack) {
      serialized.stack = redactConnectionUrls(error.stack)
    }

    const code = readStringProperty(error, 'code')
    const errorCode = readStringProperty(error, 'errorCode')
    const clientVersion = readStringProperty(error, 'clientVersion')

    if (code) {
      serialized.code = code
    }
    if (errorCode) {
      serialized.errorCode = errorCode
    }
    if (clientVersion) {
      serialized.clientVersion = clientVersion
    }

    return serialized
  }

  return {
    name: typeof error,
    message: redactConnectionUrls(String(error)),
  }
}

export function logStartupFailure(error: unknown): void {
  const startupError = serializeStartupError(error)
  logger.fatal(
    { startupError },
    `HMS API failed to start: ${startupError.name}: ${startupError.message}`,
  )
}

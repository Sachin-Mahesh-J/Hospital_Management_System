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

const SECRET_TEXT = [
  /(?:postgres(?:ql)?):\/\/\S+/gi,
  /(?:https?):\/\/[^/\s:@]+:[^/\s:@]+@\S+/gi,
  /(?:authorization|cookie|bearer|token|api[_-]?key|secret)[=:\s]+\S+/gi,
  /(?:password|passwd|pwd|secret|apikey|api_key)=[^\s&]+/gi,
] as const

export type StartupPhase =
  | 'before_database'
  | 'database_connect'
  | 'after_database'
  | 'listen'

export type StartupErrorLog = {
  name: string
  message: string
  phase?: StartupPhase
  stack?: string
  code?: string
  errorCode?: string
  clientVersion?: string
  syscall?: string
  driver?: string
}

function redactSecrets(value: string): string {
  return SECRET_TEXT.reduce(
    (redacted, pattern) => redacted.replace(pattern, '[REDACTED]'),
    value,
  )
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === 'object') {
    return value as Record<string, unknown>
  }

  return undefined
}

function readStringProperty(error: object, key: string): string | undefined {
  const value = (error as Record<string, unknown>)[key]
  if (typeof value === 'string' && value.length > 0) {
    return value
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  return undefined
}

function readFromErrorChain(error: object, key: string): string | undefined {
  let current: unknown = error

  for (let depth = 0; depth < 4 && current && typeof current === 'object'; depth += 1) {
    const value = readStringProperty(current, key)
    if (value) {
      return value
    }

    current = asRecord(current)?.cause
  }

  return undefined
}

function readStartupPhase(error: object): StartupPhase | undefined {
  const phase = readFromErrorChain(error, 'startupPhase')
  if (
    phase === 'before_database' ||
    phase === 'database_connect' ||
    phase === 'after_database' ||
    phase === 'listen'
  ) {
    return phase
  }

  return undefined
}

export function serializeStartupError(error: unknown): StartupErrorLog {
  if (error instanceof Error || (error && typeof error === 'object')) {
    const source = error as object
    const name =
      error instanceof Error
        ? error.name || 'Error'
        : readStringProperty(source, 'name') || 'object'
    const message =
      error instanceof Error
        ? error.message
        : readStringProperty(source, 'message') || String(error)

    const serialized: StartupErrorLog = {
      name,
      message: redactSecrets(message),
      driver: 'postgresql',
    }

    const phase = readStartupPhase(source)
    const stack =
      error instanceof Error && error.stack
        ? redactSecrets(error.stack)
        : undefined
    const code = readFromErrorChain(source, 'code')
    const errorCode = readFromErrorChain(source, 'errorCode')
    const clientVersion = readFromErrorChain(source, 'clientVersion')
    const syscall = readFromErrorChain(source, 'syscall')

    if (phase) {
      serialized.phase = phase
    }
    if (stack) {
      serialized.stack = stack
    }
    if (code) {
      serialized.code = code
    }
    if (errorCode) {
      serialized.errorCode = errorCode
    }
    if (clientVersion) {
      serialized.clientVersion = clientVersion
    }
    if (syscall) {
      serialized.syscall = syscall
    }

    return serialized
  }

  return {
    name: typeof error,
    message: redactSecrets(String(error)),
    driver: 'postgresql',
  }
}

export function formatStartupFailureMessage(startupError: StartupErrorLog): string {
  const parts = [
    'HMS API failed to start',
    `phase=${startupError.phase ?? 'unknown'}`,
    `name=${startupError.name}`,
    `message=${startupError.message}`,
    `driver=${startupError.driver ?? 'postgresql'}`,
  ]

  if (startupError.code) {
    parts.push(`code=${startupError.code}`)
  }
  if (startupError.errorCode) {
    parts.push(`errorCode=${startupError.errorCode}`)
  }
  if (startupError.clientVersion) {
    parts.push(`clientVersion=${startupError.clientVersion}`)
  }
  if (startupError.syscall) {
    parts.push(`syscall=${startupError.syscall}`)
  }

  return parts.join(' | ')
}

export function writeStartupDiagnostic(message: string): void {
  console.error(message)
}

export function logStartupFailure(error: unknown): void {
  const startupError = serializeStartupError(error)
  const message = formatStartupFailureMessage(startupError)
  logger.fatal({ startupError }, message)
  console.error(message)
  if (startupError.stack) {
    console.error(startupError.stack)
  }
  logger.flush()
}

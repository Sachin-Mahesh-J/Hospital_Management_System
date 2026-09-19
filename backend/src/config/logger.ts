import pino from 'pino'
import { env } from './env.js'

export const logger = pino({
  level: env.logLevel,
  base: {
    service: 'hms-api',
    environment: env.nodeEnv,
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'token',
      '*.password',
      '*.token',
    ],
    censor: '[REDACTED]',
  },
})

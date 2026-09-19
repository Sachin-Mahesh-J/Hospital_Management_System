import pino from 'pino'
import { env } from './env.js'

export const logger = pino({
  level: env.logging.level,
  base: {
    service: 'hms-api',
    environment: env.nodeEnv,
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.token',
      'req.body.refreshToken',
      'password',
      'token',
      'refreshToken',
      '*.password',
      '*.token',
      '*.refreshToken',
    ],
    censor: '[REDACTED]',
  },
})

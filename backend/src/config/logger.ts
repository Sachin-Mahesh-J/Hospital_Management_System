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
      'req.body.currentPassword',
      'req.body.newPassword',
      'req.body.token',
      'req.body.refreshToken',
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
    ],
    censor: '[REDACTED]',
  },
})

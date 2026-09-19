import type { CookieOptions, Response } from 'express'
import { env } from '../config/env.js'
import {
  REFRESH_ABSOLUTE_TTL_MS,
  REFRESH_COOKIE_PATH,
} from './auth.constants.js'

function cookieOptions(): CookieOptions {
  const production = env.nodeEnv === 'production'

  return {
    httpOnly: true,
    secure: production,
    sameSite: production ? 'none' : 'lax',
    path: REFRESH_COOKIE_PATH,
    domain: env.auth.cookieDomain ?? undefined,
    maxAge: REFRESH_ABSOLUTE_TTL_MS,
  }
}

export function setRefreshCookie(response: Response, token: string): void {
  response.cookie(env.auth.cookieName, token, cookieOptions())
}

export function clearRefreshCookie(response: Response): void {
  const { maxAge: _maxAge, ...options } = cookieOptions()
  response.clearCookie(env.auth.cookieName, options)
}

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60
export const REFRESH_ABSOLUTE_TTL_MS = 7 * 24 * 60 * 60 * 1000
export const REFRESH_IDLE_TTL_MS = 30 * 60 * 1000
export const TEMPORARY_LOCK_MS = 15 * 60 * 1000
export const FAILED_LOGIN_LIMIT = 5

export const AUTH_CSRF_HEADER = 'x-hms-csrf'
export const AUTH_CSRF_VALUE = '1'
export const REFRESH_COOKIE_PATH = '/api/v1/auth'

export const PERMISSIONS = {
  identitySelfRead: 'identity.self.read',
  identityPasswordChange: 'identity.password.change',
  patientRead: 'patient.read',
  patientCreate: 'patient.create',
  patientUpdate: 'patient.update',
} as const

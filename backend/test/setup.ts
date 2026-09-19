process.env.NODE_ENV = 'test'

if (process.env.HMS_DATABASE_TESTS === 'true') {
  process.env.TEST_DATABASE_URL = process.env.DATABASE_URL
} else {
  process.env.DATABASE_URL =
    'postgresql://postgres:test-only@localhost:5432/hms_development?schema=public'
  process.env.TEST_DATABASE_URL =
    'postgresql://postgres:test-only@localhost:5432/hms_test?schema=public'
}

process.env.ALLOWED_ORIGINS = 'http://localhost:5173'
process.env.LOG_LEVEL = 'silent'
process.env.JWT_ACCESS_SECRET =
  'test-only-access-secret-that-is-at-least-32-characters'
process.env.JWT_ISSUER = 'hms-test-api'
process.env.JWT_AUDIENCE = 'hms-test-web'
process.env.AUTH_COOKIE_NAME = 'hms_test_refresh'
process.env.TRUST_PROXY = 'false'

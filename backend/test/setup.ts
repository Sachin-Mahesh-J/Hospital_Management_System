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

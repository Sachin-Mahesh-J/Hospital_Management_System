import { describe, expect, it } from 'vitest'
import { logRedactPaths } from '../src/config/logger.js'

describe('logger redaction', () => {
  it('redacts laboratory clinical fields', () => {
    expect(logRedactPaths).toEqual(
      expect.arrayContaining([
        'req.body.clinicalNote',
        'req.body.resultValue',
        'req.body.resultNote',
        'req.body.referenceRangeSnapshot',
        '*.clinicalNote',
        '*.resultValue',
        '*.resultNote',
        '*.referenceRangeSnapshot',
        'req.body.note',
        'req.body.reason',
        'req.body.cardNumber',
        'req.body.cvv',
        'DATABASE_URL',
        'DIRECT_URL',
        'JWT_ACCESS_SECRET',
        'SUPABASE_SERVICE_ROLE_KEY',
      ]),
    )
  })
})

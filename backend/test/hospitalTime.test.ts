import { describe, expect, it } from 'vitest'
import {
  calendarDateUtc,
  hospitalToday,
  isBatchExpired,
} from '../src/config/hospitalTime.js'

describe('hospital calendar date', () => {
  it('uses the configured hospital timezone for expiry day boundaries', () => {
    const justAfterMidnightColombo = new Date('2031-03-01T00:30:00+05:30')
    expect(hospitalToday(justAfterMidnightColombo, 'Asia/Colombo')).toBe(
      '2031-03-01',
    )
    expect(hospitalToday(justAfterMidnightColombo, 'UTC')).toBe('2031-02-28')
  })

  it('treats a batch as expired only after its calendar expiry date', () => {
    const expiry = new Date('2031-03-01T00:00:00.000Z')
    expect(calendarDateUtc(expiry)).toBe('2031-03-01')
    expect(
      isBatchExpired(expiry, new Date('2031-03-01T20:00:00+05:30'), 'Asia/Colombo'),
    ).toBe(false)
    expect(
      isBatchExpired(expiry, new Date('2031-03-02T00:30:00+05:30'), 'Asia/Colombo'),
    ).toBe(true)
  })
})

import { describe, expect, it } from 'vitest'
import {
  addCalendarDays,
  calendarDateUtc,
  calendarDaysInclusive,
  hospitalDateUtcRange,
  hospitalInclusiveDateUtcRange,
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

  it('converts a hospital-local calendar day to a half-open UTC interval', () => {
    const range = hospitalDateUtcRange('2031-03-01', 'Asia/Colombo')
    expect(range.start.toISOString()).toBe('2031-02-28T18:30:00.000Z')
    expect(range.end.toISOString()).toBe('2031-03-01T18:30:00.000Z')
    expect(hospitalToday(range.start, 'Asia/Colombo')).toBe('2031-03-01')
    expect(hospitalToday(new Date(range.end.getTime() - 1), 'Asia/Colombo')).toBe(
      '2031-03-01',
    )
    expect(hospitalToday(range.end, 'Asia/Colombo')).toBe('2031-03-02')
  })

  it('keeps inclusive report ranges half-open in UTC', () => {
    const range = hospitalInclusiveDateUtcRange(
      '2031-03-01',
      '2031-03-02',
      'Asia/Colombo',
    )
    expect(range.start.toISOString()).toBe('2031-02-28T18:30:00.000Z')
    expect(range.end.toISOString()).toBe('2031-03-02T18:30:00.000Z')
    expect(addCalendarDays('2031-03-01', 30)).toBe('2031-03-31')
    expect(calendarDaysInclusive('2031-01-01', '2031-12-31')).toBe(365)
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

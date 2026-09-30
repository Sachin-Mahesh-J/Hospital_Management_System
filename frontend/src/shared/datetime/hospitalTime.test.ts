import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  HOSPITAL_TIMEZONE,
  addCalendarDays,
  formatCalendarDate,
  formatHospitalDate,
  formatHospitalDateTime,
  formatHospitalMonthYear,
  formatHospitalTime,
  hospitalCalendarDate,
  hospitalDateTimeToOffsetIso,
  hospitalDateUtcRange,
  hospitalToday,
  instantToHospitalInput,
  isHospitalToday,
  startOfHospitalWeek,
} from './hospitalTime'

describe('hospital time', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('uses Asia/Colombo as the hospital timezone', () => {
    expect(HOSPITAL_TIMEZONE).toBe('Asia/Colombo')
  })

  it('calculates today from Asia/Colombo, not UTC', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-29T20:00:00.000Z'))
    expect(new Date().toISOString().slice(0, 10)).toBe('2026-09-29')
    expect(hospitalToday()).toBe('2026-09-30')
    expect(isHospitalToday('2026-09-30')).toBe(true)
    expect(isHospitalToday('2026-09-29')).toBe(false)
  })

  it('keeps 29 Sep as today just before Colombo midnight', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-29T18:29:00.000Z'))
    expect(hospitalToday()).toBe('2026-09-29')
  })

  it('treats datetime-local values as hospital wall clock', () => {
    expect(hospitalDateTimeToOffsetIso('2026-09-30T10:00')).toBe(
      '2026-09-30T10:00:00+05:30',
    )
    expect(instantToHospitalInput('2026-09-30T04:30:00.000Z')).toBe(
      '2026-09-30T10:00',
    )
  })

  it('formats stored UTC timestamps in hospital time without exposing the zone', () => {
    expect(formatHospitalDateTime('2026-09-30T04:30:00.000Z')).toBe(
      '30 Sep 2026, 10:00 AM',
    )
    expect(formatHospitalDate('2026-09-30T04:30:00.000Z')).toBe('30 Sep 2026')
    expect(formatHospitalTime('2026-09-30T04:30:00.000Z')).toBe('10:00 AM')
    expect(formatCalendarDate('2026-09-30')).toBe('30 Sep 2026')
    expect(formatHospitalMonthYear('2026-09-30')).toBe('Sep 2026')
  })

  it('does not treat a viewed date as today', () => {
    const now = new Date('2026-09-30T04:30:00.000Z')
    expect(isHospitalToday('2026-10-15', now)).toBe(false)
    expect(isHospitalToday('2026-09-30', now)).toBe(true)
  })

  it('places UTC date boundaries on the hospital calendar day', () => {
    const range = hospitalDateUtcRange('2026-09-30')
    expect(hospitalCalendarDate(range.start)).toBe('2026-09-30')
    expect(hospitalCalendarDate(new Date(range.end.getTime() - 1))).toBe(
      '2026-09-30',
    )
    expect(hospitalCalendarDate(range.end)).toBe('2026-10-01')
    expect(addCalendarDays('2026-09-30', 1)).toBe('2026-10-01')
    expect(startOfHospitalWeek('2026-09-30')).toBe('2026-09-28')
  })
})

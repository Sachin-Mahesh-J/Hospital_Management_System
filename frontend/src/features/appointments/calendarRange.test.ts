import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  appointmentOverlapsHospitalDay,
  calendarDays,
  calendarRange,
  durationMinutes,
  hospitalSlotDateTimeValue,
  minutesFromHospitalDayStart,
  shiftCalendarAnchor,
} from './calendarRange'
import { hospitalToday, isHospitalToday } from '../../shared/datetime/hospitalTime'

describe('calendarRange', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('opens day, week, and month windows around hospital-local today', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-29T20:00:00.000Z'))
    const today = hospitalToday()
    expect(today).toBe('2026-09-30')

    const day = calendarRange(today, 'day')
    expect(day.days).toEqual(['2026-09-30'])
    expect(day.from.toISOString()).toBe('2026-09-29T18:30:00.000Z')
    expect(day.to.toISOString()).toBe('2026-09-30T18:30:00.000Z')

    const week = calendarRange(today, 'week')
    expect(week.days[0]).toBe('2026-09-28')
    expect(week.days).toContain('2026-09-30')
    expect(week.days).toHaveLength(7)

    const month = calendarRange(today, 'month')
    expect(month.days).toHaveLength(42)
    expect(month.days).toContain('2026-09-30')
    expect(calendarDays(today, 'month')[0]).toBe('2026-08-31')
  })

  it('keeps today identified after navigating to another date', () => {
    const now = new Date('2026-09-30T04:30:00.000Z')
    const viewed = shiftCalendarAnchor('2026-09-30', 'month', 1)
    expect(viewed).toBe('2026-10-01')
    expect(isHospitalToday(viewed, now)).toBe(false)
    expect(isHospitalToday('2026-09-30', now)).toBe(true)
  })

  it('places appointments using hospital-local day boundaries', () => {
    expect(
      appointmentOverlapsHospitalDay(
        '2026-09-30T04:30:00.000Z',
        '2026-09-30T05:00:00.000Z',
        '2026-09-30',
      ),
    ).toBe(true)
    expect(
      appointmentOverlapsHospitalDay(
        '2026-09-29T18:00:00.000Z',
        '2026-09-29T18:20:00.000Z',
        '2026-09-30',
      ),
    ).toBe(false)
    expect(durationMinutes('2026-09-30T04:30:00.000Z', '2026-09-30T04:50:00.000Z')).toBe(20)
    expect(minutesFromHospitalDayStart('2026-09-30T03:00:00.000Z', '2026-09-30')).toBe(8 * 60 + 30)
    expect(hospitalSlotDateTimeValue('2026-09-30', 9)).toBe('2026-09-30T09:00')
  })
})

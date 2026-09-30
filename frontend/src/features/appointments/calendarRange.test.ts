import { describe, expect, it } from 'vitest'
import {
  addDays,
  appointmentOverlapsLocalDay,
  calendarRange,
  durationMinutes,
  minutesFromDayStart,
  startOfLocalDay,
  startOfWeek,
  toLocalDateTimeValue,
} from './calendarRange'

describe('calendarRange', () => {
  it('maps day, week, and month windows from the local anchor', () => {
    const wednesday = new Date(2026, 8, 30, 15, 0, 0)
    const day = calendarRange(wednesday, 'day')
    expect(day.from).toEqual(startOfLocalDay(wednesday))
    expect(day.to).toEqual(addDays(startOfLocalDay(wednesday), 1))

    const week = calendarRange(wednesday, 'week')
    expect(week.from).toEqual(startOfWeek(wednesday))
    expect(week.to).toEqual(addDays(startOfWeek(wednesday), 7))

    const month = calendarRange(new Date(2026, 8, 1), 'month')
    expect(month.from.getDay()).toBe(1)
    expect((month.to.getTime() - month.from.getTime()) / 86_400_000).toBe(42)
  })

  it('places appointments using actual start and end instants', () => {
    const day = new Date(2026, 5, 1)
    expect(
      appointmentOverlapsLocalDay(
        '2026-06-01T10:00:00.000Z',
        '2026-06-01T10:20:00.000Z',
        day,
      ),
    ).toBe(true)
    expect(durationMinutes('2026-06-01T10:00:00.000Z', '2026-06-01T10:20:00.000Z')).toBe(20)
    expect(minutesFromDayStart(new Date(2026, 5, 1, 8, 30).toISOString(), day)).toBe(8 * 60 + 30)
    expect(toLocalDateTimeValue(new Date(2026, 5, 1, 9, 0))).toBe('2026-06-01T09:00')
  })
})

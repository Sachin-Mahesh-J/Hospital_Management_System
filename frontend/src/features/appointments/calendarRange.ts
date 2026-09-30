import {
  addCalendarDays,
  addCalendarMonths,
  formatCalendarDate,
  hospitalDateUtcRange,
  hospitalLocalMidnightUtc,
  startOfHospitalMonth,
  startOfHospitalWeek,
  type HospitalLocalParts,
  hospitalLocalParts,
} from '../../shared/datetime/hospitalTime'

export type CalendarView = 'day' | 'week' | 'month'

export const CALENDAR_START_HOUR = 7
export const CALENDAR_END_HOUR = 19
export const HOUR_HEIGHT_PX = 48

export type CalendarRange = {
  from: Date
  to: Date
  days: string[]
  fromDate: string
  toDate: string
}

export function calendarDays(anchorDate: string, view: CalendarView): string[] {
  if (view === 'day') return [anchorDate]
  if (view === 'week') {
    const start = startOfHospitalWeek(anchorDate)
    return Array.from({ length: 7 }, (_, index) => addCalendarDays(start, index))
  }
  const gridStart = startOfHospitalWeek(startOfHospitalMonth(anchorDate))
  return Array.from({ length: 42 }, (_, index) => addCalendarDays(gridStart, index))
}

export function calendarRange(
  anchorDate: string,
  view: CalendarView,
): CalendarRange {
  const days = calendarDays(anchorDate, view)
  const fromDate = days[0]
  const toDate = addCalendarDays(days[days.length - 1], 1)
  return {
    fromDate,
    toDate,
    days,
    from: hospitalLocalMidnightUtc(fromDate),
    to: hospitalLocalMidnightUtc(toDate),
  }
}

export function shiftCalendarAnchor(
  anchorDate: string,
  view: CalendarView,
  direction: number,
): string {
  if (view === 'day') return addCalendarDays(anchorDate, direction)
  if (view === 'week') return addCalendarDays(anchorDate, direction * 7)
  return addCalendarMonths(anchorDate, direction)
}

export function appointmentOverlapsHospitalDay(
  startsAt: string,
  endsAt: string,
  calendarDate: string,
): boolean {
  const { start, end } = hospitalDateUtcRange(calendarDate)
  return Date.parse(startsAt) < end.getTime() && Date.parse(endsAt) > start.getTime()
}

export function minutesFromHospitalDayStart(
  iso: string,
  calendarDate: string,
): number {
  const start = hospitalLocalMidnightUtc(calendarDate).getTime()
  return Math.round((Date.parse(iso) - start) / 60_000)
}

export function durationMinutes(startsAt: string, endsAt: string): number {
  return Math.max(1, Math.round((Date.parse(endsAt) - Date.parse(startsAt)) / 60_000))
}

export function hospitalSlotDateTimeValue(
  calendarDate: string,
  hour: number,
): string {
  return `${calendarDate}T${String(hour).padStart(2, '0')}:00`
}

export function formatDayHeading(calendarDate: string): string {
  const instant = hospitalLocalMidnightUtc(calendarDate)
  const parts: HospitalLocalParts = hospitalLocalParts(instant)
  return `${parts.weekday}, ${formatCalendarDate(calendarDate)}`
}

export function formatCalendarHeading(
  anchorDate: string,
  view: CalendarView,
): string {
  if (view === 'month') {
    const [year, month] = anchorDate.split('-').map(Number)
    return new Intl.DateTimeFormat('en-GB', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(year, month - 1, 1)))
  }
  return formatCalendarDate(anchorDate)
}

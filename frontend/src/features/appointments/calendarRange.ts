export type CalendarView = 'day' | 'week' | 'month'

export const CALENDAR_START_HOUR = 7
export const CALENDAR_END_HOUR = 19
export const HOUR_HEIGHT_PX = 48

export function startOfLocalDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

export function addDays(value: Date, days: number): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate() + days)
}

export function startOfWeek(value: Date): Date {
  const start = startOfLocalDay(value)
  const weekday = start.getDay()
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday
  return addDays(start, mondayOffset)
}

export function startOfMonth(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), 1)
}

export function calendarRange(
  anchor: Date,
  view: CalendarView,
): { from: Date; to: Date } {
  if (view === 'day') {
    const from = startOfLocalDay(anchor)
    return { from, to: addDays(from, 1) }
  }
  if (view === 'week') {
    const from = startOfWeek(anchor)
    return { from, to: addDays(from, 7) }
  }
  const monthStart = startOfMonth(anchor)
  const gridStart = startOfWeek(monthStart)
  return { from: gridStart, to: addDays(gridStart, 42) }
}

export function toOffsetIso(value: Date): string {
  const offsetMin = -value.getTimezoneOffset()
  const sign = offsetMin >= 0 ? '+' : '-'
  const abs = Math.abs(offsetMin)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}:00${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
}

export function toLocalDateTimeValue(value: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`
}

export function appointmentOverlapsLocalDay(
  startsAt: string,
  endsAt: string,
  day: Date,
): boolean {
  const start = new Date(startsAt).getTime()
  const end = new Date(endsAt).getTime()
  const dayStart = startOfLocalDay(day).getTime()
  const dayEnd = addDays(day, 1).getTime()
  return start < dayEnd && end > dayStart
}

export function minutesFromDayStart(iso: string, day: Date): number {
  const instant = new Date(iso).getTime()
  const start = startOfLocalDay(day).getTime()
  return Math.round((instant - start) / 60_000)
}

export function durationMinutes(startsAt: string, endsAt: string): number {
  return Math.max(1, Math.round((Date.parse(endsAt) - Date.parse(startsAt)) / 60_000))
}

export function slotStart(day: Date, hour: number): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, 0, 0)
}

export function formatDayHeading(value: Date): string {
  return value.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

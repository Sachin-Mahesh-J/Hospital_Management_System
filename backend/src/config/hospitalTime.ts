import { env } from './env.js'

export function hospitalToday(
  now = new Date(),
  timeZone = env.hospital.timezone,
): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

export function calendarDateUtc(value: Date): string {
  const year = value.getUTCFullYear()
  const month = String(value.getUTCMonth() + 1).padStart(2, '0')
  const day = String(value.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addCalendarDays(calendarDate: string, days: number): string {
  const utc = new Date(`${calendarDate}T00:00:00.000Z`)
  utc.setUTCDate(utc.getUTCDate() + days)
  return calendarDateUtc(utc)
}

export function calendarDaysInclusive(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00.000Z`)
  const end = Date.parse(`${to}T00:00:00.000Z`)
  return Math.round((end - start) / 86_400_000) + 1
}

function timeZoneOffsetMs(instant: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
  const parts = Object.fromEntries(
    formatter.formatToParts(instant).map((part) => [part.type, part.value]),
  )
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  )
  return asUtc - instant.getTime()
}

export function hospitalLocalMidnightUtc(
  calendarDate: string,
  timeZone = env.hospital.timezone,
): Date {
  const utcGuess = new Date(`${calendarDate}T00:00:00.000Z`)
  const offset = timeZoneOffsetMs(utcGuess, timeZone)
  const adjusted = new Date(utcGuess.getTime() - offset)
  const correctedOffset = timeZoneOffsetMs(adjusted, timeZone)
  if (correctedOffset !== offset) {
    return new Date(utcGuess.getTime() - correctedOffset)
  }
  return adjusted
}

export function hospitalDateUtcRange(
  calendarDate: string,
  timeZone = env.hospital.timezone,
): { start: Date; end: Date } {
  return {
    start: hospitalLocalMidnightUtc(calendarDate, timeZone),
    end: hospitalLocalMidnightUtc(addCalendarDays(calendarDate, 1), timeZone),
  }
}

export function hospitalInclusiveDateUtcRange(
  from: string,
  to: string,
  timeZone = env.hospital.timezone,
): { start: Date; end: Date } {
  return {
    start: hospitalLocalMidnightUtc(from, timeZone),
    end: hospitalLocalMidnightUtc(addCalendarDays(to, 1), timeZone),
  }
}

export function isBatchExpired(
  expiryDate: Date,
  now = new Date(),
  timeZone = env.hospital.timezone,
): boolean {
  return calendarDateUtc(expiryDate) < hospitalToday(now, timeZone)
}

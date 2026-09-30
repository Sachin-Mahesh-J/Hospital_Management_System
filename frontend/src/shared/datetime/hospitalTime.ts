export const HOSPITAL_TIMEZONE = 'Asia/Colombo'

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

export type HospitalLocalParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
  weekday: (typeof WEEKDAYS)[number]
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

export function toCalendarDate(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`
}

export function hospitalLocalParts(
  instant: Date,
  timeZone = HOSPITAL_TIMEZONE,
): HospitalLocalParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
    hourCycle: 'h23',
  })
  const parts = Object.fromEntries(
    formatter.formatToParts(instant).map((part) => [part.type, part.value]),
  )
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: parts.weekday as HospitalLocalParts['weekday'],
  }
}

export function hospitalToday(
  now = new Date(),
  timeZone = HOSPITAL_TIMEZONE,
): string {
  const parts = hospitalLocalParts(now, timeZone)
  return toCalendarDate(parts.year, parts.month, parts.day)
}

export function hospitalCalendarDate(
  value: string | Date,
  timeZone = HOSPITAL_TIMEZONE,
): string {
  const instant = typeof value === 'string' ? new Date(value) : value
  return hospitalToday(instant, timeZone)
}

export function calendarDateUtc(value: Date): string {
  return toCalendarDate(
    value.getUTCFullYear(),
    value.getUTCMonth() + 1,
    value.getUTCDate(),
  )
}

export function addCalendarDays(calendarDate: string, days: number): string {
  const utc = new Date(`${calendarDate}T00:00:00.000Z`)
  utc.setUTCDate(utc.getUTCDate() + days)
  return calendarDateUtc(utc)
}

export function addCalendarMonths(calendarDate: string, months: number): string {
  const [year, month] = calendarDate.split('-').map(Number)
  return calendarDateUtc(new Date(Date.UTC(year, month - 1 + months, 1)))
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

function formatOffset(offsetMs: number): string {
  const sign = offsetMs >= 0 ? '+' : '-'
  const abs = Math.abs(offsetMs)
  const hours = Math.floor(abs / 3_600_000)
  const minutes = Math.floor((abs % 3_600_000) / 60_000)
  return `${sign}${pad(hours)}:${pad(minutes)}`
}

export function hospitalLocalMidnightUtc(
  calendarDate: string,
  timeZone = HOSPITAL_TIMEZONE,
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
  timeZone = HOSPITAL_TIMEZONE,
): { start: Date; end: Date } {
  return {
    start: hospitalLocalMidnightUtc(calendarDate, timeZone),
    end: hospitalLocalMidnightUtc(addCalendarDays(calendarDate, 1), timeZone),
  }
}

export function hospitalWeekday(
  calendarDate: string,
  timeZone = HOSPITAL_TIMEZONE,
): number {
  const name = hospitalLocalParts(
    hospitalLocalMidnightUtc(calendarDate, timeZone),
    timeZone,
  ).weekday
  return WEEKDAYS.indexOf(name)
}

export function startOfHospitalWeek(calendarDate: string): string {
  const weekday = hospitalWeekday(calendarDate)
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday
  return addCalendarDays(calendarDate, mondayOffset)
}

export function startOfHospitalMonth(calendarDate: string): string {
  const [year, month] = calendarDate.split('-').map(Number)
  return toCalendarDate(year, month, 1)
}

export function isHospitalToday(
  calendarDate: string,
  now = new Date(),
  timeZone = HOSPITAL_TIMEZONE,
): boolean {
  return calendarDate === hospitalToday(now, timeZone)
}

export function hospitalDateTimeToOffsetIso(
  value: string,
  timeZone = HOSPITAL_TIMEZONE,
): string {
  const [datePart, timePart] = value.split('T')
  if (!datePart || !timePart) return value
  const [hourText, minuteText] = timePart.split(':')
  const hour = Number(hourText)
  const minute = Number(minuteText)
  const wall = `${datePart}T${pad(hour)}:${pad(minute)}:00`
  const utcGuess = new Date(`${wall}.000Z`)
  const offset = timeZoneOffsetMs(utcGuess, timeZone)
  const adjusted = new Date(utcGuess.getTime() - offset)
  const correctedOffset = timeZoneOffsetMs(adjusted, timeZone)
  const finalOffset = correctedOffset !== offset ? correctedOffset : offset
  return `${wall}${formatOffset(finalOffset)}`
}

export function instantToHospitalInput(
  iso: string,
  timeZone = HOSPITAL_TIMEZONE,
): string {
  const parts = hospitalLocalParts(new Date(iso), timeZone)
  return `${toCalendarDate(parts.year, parts.month, parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`
}

function formatClock(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  return `${hour12}:${pad(minute)} ${period}`
}

function formatCivilDate(year: number, month: number, day: number): string {
  return `${day} ${MONTHS[month - 1]} ${year}`
}

export function formatCalendarDate(calendarDate: string): string {
  const [year, month, day] = calendarDate.split('-').map(Number)
  if (!year || !month || !day) return calendarDate
  return formatCivilDate(year, month, day)
}

export function formatHospitalMonthYear(calendarDate: string): string {
  const [year, month] = calendarDate.split('-').map(Number)
  return `${MONTHS[month - 1]} ${year}`
}

export function formatHospitalDate(
  value: string | Date,
  timeZone = HOSPITAL_TIMEZONE,
): string {
  const instant = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(instant.getTime())) return ''
  const parts = hospitalLocalParts(instant, timeZone)
  return formatCivilDate(parts.year, parts.month, parts.day)
}

export function formatHospitalTime(
  value: string | Date,
  timeZone = HOSPITAL_TIMEZONE,
): string {
  const instant = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(instant.getTime())) return ''
  const parts = hospitalLocalParts(instant, timeZone)
  return formatClock(parts.hour, parts.minute)
}

export function formatHospitalDateTime(
  value: string | Date | null | undefined,
  timeZone = HOSPITAL_TIMEZONE,
): string {
  if (!value) return ''
  const instant = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(instant.getTime())) return ''
  const parts = hospitalLocalParts(instant, timeZone)
  return `${formatCivilDate(parts.year, parts.month, parts.day)}, ${formatClock(parts.hour, parts.minute)}`
}

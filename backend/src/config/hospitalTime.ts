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

export function isBatchExpired(
  expiryDate: Date,
  now = new Date(),
  timeZone = env.hospital.timezone,
): boolean {
  return calendarDateUtc(expiryDate) < hospitalToday(now, timeZone)
}

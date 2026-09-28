export const scheduleStatuses = ['available', 'unavailable', 'cancelled'] as const

export type ScheduleStatus = (typeof scheduleStatuses)[number]

export type DoctorSchedule = {
  id: string
  doctorId: string
  startsAt: string
  endsAt: string
  status: ScheduleStatus
  note: string | null
  createdAt: string
  updatedAt: string
}

export type ScheduleInput = {
  startsAt: string
  endsAt: string
  status?: ScheduleStatus
  note?: string | null
}

export type ScheduleUpdate = Partial<ScheduleInput>

export type ScheduleFilters = {
  page: number
  pageSize: number
  status?: ScheduleStatus
}

export type ScheduleListResult = {
  data: DoctorSchedule[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}

export function localDateTimeToOffsetIso(value: string): string {
  const [datePart, timePart] = value.split('T')
  if (!datePart || !timePart) return value
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute] = timePart.split(':').map(Number)
  const local = new Date(year, month - 1, day, hour, minute, 0)
  const offsetMin = -local.getTimezoneOffset()
  const sign = offsetMin >= 0 ? '+' : '-'
  const abs = Math.abs(offsetMin)
  const hours = String(Math.floor(abs / 60)).padStart(2, '0')
  const minutes = String(abs % 60).padStart(2, '0')
  return `${datePart}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00${sign}${hours}:${minutes}`
}

export function instantToLocalInput(iso: string): string {
  const date = new Date(iso)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

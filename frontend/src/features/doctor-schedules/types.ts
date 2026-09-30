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

export {
  hospitalDateTimeToOffsetIso as localDateTimeToOffsetIso,
  instantToHospitalInput as instantToLocalInput,
} from '../../shared/datetime/hospitalTime'

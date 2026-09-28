import { apiClient } from '../../api/client'
import type {
  DoctorSchedule,
  ScheduleFilters,
  ScheduleInput,
  ScheduleListResult,
  ScheduleUpdate,
} from './types'

type PaginatedResponse = {
  data: DoctorSchedule[]
  meta: { pagination: ScheduleListResult['pagination'] }
}

function queryString(filters: ScheduleFilters): string {
  const params = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize),
  })
  if (filters.status) params.set('status', filters.status)
  return params.toString()
}

export async function fetchDoctorSchedules(
  doctorId: string,
  filters: ScheduleFilters,
): Promise<ScheduleListResult> {
  const response = await apiClient.getEnvelope<DoctorSchedule[]>(
    `/doctors/${encodeURIComponent(doctorId)}/schedules?${queryString(filters)}`,
  ) as PaginatedResponse
  return { data: response.data, pagination: response.meta.pagination }
}

export function createDoctorSchedule(
  doctorId: string,
  input: ScheduleInput,
): Promise<DoctorSchedule> {
  return apiClient.post<DoctorSchedule>(
    `/doctors/${encodeURIComponent(doctorId)}/schedules`,
    input,
  )
}

export function updateDoctorSchedule(
  doctorId: string,
  scheduleId: string,
  input: ScheduleUpdate,
): Promise<DoctorSchedule> {
  return apiClient.patch<DoctorSchedule>(
    `/doctors/${encodeURIComponent(doctorId)}/schedules/${encodeURIComponent(scheduleId)}`,
    input,
  )
}

import { apiClient } from '../../api/client'
import type {
  Attendance,
  AttendanceFilters,
  AttendanceInput,
  AttendanceListResult,
  AttendanceUpdate,
} from './types'

type PaginatedResponse = {
  data: Attendance[]
  meta: { pagination: AttendanceListResult['pagination'] }
}

function queryString(filters: AttendanceFilters): string {
  const params = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize),
  })
  if (filters.employeeId) params.set('employeeId', filters.employeeId)
  if (filters.status) params.set('status', filters.status)
  if (filters.workDateFrom) params.set('workDateFrom', filters.workDateFrom)
  if (filters.workDateTo) params.set('workDateTo', filters.workDateTo)
  return params.toString()
}

export async function fetchAttendance(
  filters: AttendanceFilters,
): Promise<AttendanceListResult> {
  const response = await apiClient.getEnvelope<Attendance[]>(
    `/attendance?${queryString(filters)}`,
  ) as PaginatedResponse
  return { data: response.data, pagination: response.meta.pagination }
}

export function createAttendance(input: AttendanceInput): Promise<Attendance> {
  return apiClient.post<Attendance>('/attendance', input)
}

export function updateAttendance(
  id: string,
  input: AttendanceUpdate,
): Promise<Attendance> {
  return apiClient.patch<Attendance>(`/attendance/${encodeURIComponent(id)}`, input)
}

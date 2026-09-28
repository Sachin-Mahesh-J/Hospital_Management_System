import { apiClient } from '../../api/client'
import type {
  Appointment,
  AppointmentFilters,
  AppointmentInput,
  AppointmentListResult,
  AppointmentRescheduleInput,
  AppointmentStatusAction,
  AppointmentUpdate,
} from './types'

type PaginatedResponse = {
  data: Appointment[]
  meta: { pagination: AppointmentListResult['pagination'] }
}

function queryString(filters: AppointmentFilters): string {
  const params = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize),
  })
  if (filters.patientId) params.set('patientId', filters.patientId)
  if (filters.doctorId) params.set('doctorId', filters.doctorId)
  if (filters.status) params.set('status', filters.status)
  if (filters.startsAtFrom) params.set('startsAtFrom', filters.startsAtFrom)
  if (filters.startsAtTo) params.set('startsAtTo', filters.startsAtTo)
  if (filters.sortBy) params.set('sortBy', filters.sortBy)
  if (filters.sortOrder) params.set('sortOrder', filters.sortOrder)
  return params.toString()
}

export async function fetchAppointments(
  filters: AppointmentFilters,
): Promise<AppointmentListResult> {
  const response = await apiClient.getEnvelope<Appointment[]>(
    `/appointments?${queryString(filters)}`,
  ) as PaginatedResponse
  return { data: response.data, pagination: response.meta.pagination }
}

export function fetchAppointment(id: string): Promise<Appointment> {
  return apiClient.get<Appointment>(`/appointments/${encodeURIComponent(id)}`)
}

export function createAppointment(input: AppointmentInput): Promise<Appointment> {
  return apiClient.post<Appointment>('/appointments', input)
}

export function updateAppointment(
  id: string,
  input: AppointmentUpdate,
): Promise<Appointment> {
  return apiClient.patch<Appointment>(
    `/appointments/${encodeURIComponent(id)}`,
    input,
  )
}

export function cancelAppointment(
  id: string,
  cancellationReason: string,
): Promise<Appointment> {
  return apiClient.post<Appointment>(
    `/appointments/${encodeURIComponent(id)}/cancel`,
    { cancellationReason },
  )
}

export function rescheduleAppointment(
  id: string,
  input: AppointmentRescheduleInput,
): Promise<Appointment> {
  return apiClient.post<Appointment>(
    `/appointments/${encodeURIComponent(id)}/reschedule`,
    input,
  )
}

export function updateAppointmentStatus(
  id: string,
  status: AppointmentStatusAction,
): Promise<Appointment> {
  return apiClient.patch<Appointment>(
    `/appointments/${encodeURIComponent(id)}/status`,
    { status },
  )
}

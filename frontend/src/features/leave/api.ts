import { apiClient } from '../../api/client'
import type {
  LeaveFilters,
  LeaveInput,
  LeaveListResult,
  LeaveRecord,
  LeaveUpdate,
} from './types'

type PaginatedResponse = {
  data: LeaveRecord[]
  meta: { pagination: LeaveListResult['pagination'] }
}

function queryString(filters: LeaveFilters): string {
  const params = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize),
  })
  if (filters.employeeId) params.set('employeeId', filters.employeeId)
  if (filters.status) params.set('status', filters.status)
  if (filters.overlapsFrom) params.set('overlapsFrom', filters.overlapsFrom)
  if (filters.overlapsTo) params.set('overlapsTo', filters.overlapsTo)
  return params.toString()
}

export async function fetchLeave(filters: LeaveFilters): Promise<LeaveListResult> {
  const response = await apiClient.getEnvelope<LeaveRecord[]>(
    `/leave?${queryString(filters)}`,
  ) as PaginatedResponse
  return { data: response.data, pagination: response.meta.pagination }
}

export function createLeave(input: LeaveInput): Promise<LeaveRecord> {
  return apiClient.post<LeaveRecord>('/leave', input)
}

export function updateLeave(id: string, input: LeaveUpdate): Promise<LeaveRecord> {
  return apiClient.patch<LeaveRecord>(`/leave/${encodeURIComponent(id)}`, input)
}

export function approveLeave(id: string, decisionNote?: string): Promise<LeaveRecord> {
  return apiClient.post<LeaveRecord>(`/leave/${encodeURIComponent(id)}/approve`, {
    ...(decisionNote ? { decisionNote } : {}),
  })
}

export function rejectLeave(id: string, decisionNote?: string): Promise<LeaveRecord> {
  return apiClient.post<LeaveRecord>(`/leave/${encodeURIComponent(id)}/reject`, {
    ...(decisionNote ? { decisionNote } : {}),
  })
}

export function cancelLeave(id: string): Promise<LeaveRecord> {
  return apiClient.post<LeaveRecord>(`/leave/${encodeURIComponent(id)}/cancel`)
}

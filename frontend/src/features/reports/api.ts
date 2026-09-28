import { apiClient } from '../../api/client'
import type {
  AppointmentReportRow,
  Dashboard,
  DateReportFilters,
  LaboratoryReportRow,
  PaginatedResult,
  PatientReportFilters,
  PatientReportRow,
  PharmacyReportFilters,
  PharmacyReportResult,
  RevenueReportFilters,
  RevenueReportResult,
  StaffReportFilters,
  StaffReportRow,
} from './types'

type PaginatedResponse<T> = {
  data: T[]
  meta: {
    pagination: PaginatedResult<T>['pagination']
    summary?: RevenueReportResult['summary'] | PharmacyReportResult['summary']
    section?: PharmacyReportResult['section']
  }
}

function paginationParams(filters: {
  page: number
  pageSize: number
}): URLSearchParams {
  return new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize),
  })
}

function fromPaginated<T>(
  response: PaginatedResponse<T>,
): PaginatedResult<T> {
  return { data: response.data, pagination: response.meta.pagination }
}

export function fetchDashboard(): Promise<Dashboard> {
  return apiClient.get<Dashboard>('/dashboard')
}

export async function fetchPatientReport(
  filters: PatientReportFilters,
): Promise<PaginatedResult<PatientReportRow>> {
  const params = paginationParams(filters)
  if (filters.status) params.set('status', filters.status)
  const response = await apiClient.getEnvelope<PatientReportRow[]>(
    `/reports/patients?${params.toString()}`,
  ) as PaginatedResponse<PatientReportRow>
  return fromPaginated(response)
}

export async function fetchAppointmentReport(
  filters: DateReportFilters,
): Promise<PaginatedResult<AppointmentReportRow>> {
  const params = paginationParams(filters)
  params.set('from', filters.from)
  params.set('to', filters.to)
  if (filters.status) params.set('status', filters.status)
  const response = await apiClient.getEnvelope<AppointmentReportRow[]>(
    `/reports/appointments?${params.toString()}`,
  ) as PaginatedResponse<AppointmentReportRow>
  return fromPaginated(response)
}

export async function fetchRevenueReport(
  filters: RevenueReportFilters,
): Promise<RevenueReportResult> {
  const params = paginationParams(filters)
  params.set('from', filters.from)
  params.set('to', filters.to)
  if (filters.method) params.set('method', filters.method)
  const response = await apiClient.getEnvelope<RevenueReportResult['data'][number][]>(
    `/reports/revenue?${params.toString()}`,
  ) as PaginatedResponse<RevenueReportResult['data'][number]>
  return {
    ...fromPaginated(response),
    summary: response.meta.summary as RevenueReportResult['summary'],
  }
}

export async function fetchPharmacyReport(
  filters: PharmacyReportFilters,
): Promise<PharmacyReportResult> {
  const params = paginationParams(filters)
  params.set('section', filters.section)
  const response = await apiClient.getEnvelope<PharmacyReportResult['data'][number][]>(
    `/reports/pharmacy?${params.toString()}`,
  ) as PaginatedResponse<PharmacyReportResult['data'][number]>
  return {
    ...fromPaginated(response),
    summary: response.meta.summary as PharmacyReportResult['summary'],
    section: response.meta.section ?? filters.section,
  }
}

export async function fetchLaboratoryReport(
  filters: DateReportFilters,
): Promise<PaginatedResult<LaboratoryReportRow>> {
  const params = paginationParams(filters)
  params.set('from', filters.from)
  params.set('to', filters.to)
  if (filters.status) params.set('status', filters.status)
  const response = await apiClient.getEnvelope<LaboratoryReportRow[]>(
    `/reports/laboratory?${params.toString()}`,
  ) as PaginatedResponse<LaboratoryReportRow>
  return fromPaginated(response)
}

export async function fetchStaffReport(
  filters: StaffReportFilters,
): Promise<PaginatedResult<StaffReportRow>> {
  const params = paginationParams(filters)
  if (filters.employmentStatus) {
    params.set('employmentStatus', filters.employmentStatus)
  }
  const response = await apiClient.getEnvelope<StaffReportRow[]>(
    `/reports/staff?${params.toString()}`,
  ) as PaginatedResponse<StaffReportRow>
  return fromPaginated(response)
}

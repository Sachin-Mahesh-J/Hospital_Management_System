import { useQuery } from '@tanstack/react-query'
import {
  fetchAppointmentReport,
  fetchDashboard,
  fetchLaboratoryReport,
  fetchPatientReport,
  fetchPharmacyReport,
  fetchRevenueReport,
  fetchStaffReport,
} from './api'
import type {
  DateReportFilters,
  PatientReportFilters,
  PharmacyReportFilters,
  RevenueReportFilters,
  StaffReportFilters,
} from './types'

export const reportKeys = {
  all: ['reports'] as const,
  dashboard: () => [...reportKeys.all, 'dashboard'] as const,
  patients: (filters: PatientReportFilters) =>
    [...reportKeys.all, 'patients', filters] as const,
  appointments: (filters: DateReportFilters) =>
    [...reportKeys.all, 'appointments', filters] as const,
  revenue: (filters: RevenueReportFilters) =>
    [...reportKeys.all, 'revenue', filters] as const,
  pharmacy: (filters: PharmacyReportFilters) =>
    [...reportKeys.all, 'pharmacy', filters] as const,
  laboratory: (filters: DateReportFilters) =>
    [...reportKeys.all, 'laboratory', filters] as const,
  staff: (filters: StaffReportFilters) =>
    [...reportKeys.all, 'staff', filters] as const,
}

export function useDashboard(enabled: boolean) {
  return useQuery({
    queryKey: reportKeys.dashboard(),
    queryFn: fetchDashboard,
    enabled,
  })
}

export function usePatientReport(filters: PatientReportFilters) {
  return useQuery({
    queryKey: reportKeys.patients(filters),
    queryFn: () => fetchPatientReport(filters),
    placeholderData: (previous) => previous,
  })
}

export function useAppointmentReport(
  filters: DateReportFilters,
  enabled: boolean,
) {
  return useQuery({
    queryKey: reportKeys.appointments(filters),
    queryFn: () => fetchAppointmentReport(filters),
    enabled,
    placeholderData: (previous) => previous,
  })
}

export function useRevenueReport(
  filters: RevenueReportFilters,
  enabled: boolean,
) {
  return useQuery({
    queryKey: reportKeys.revenue(filters),
    queryFn: () => fetchRevenueReport(filters),
    enabled,
    placeholderData: (previous) => previous,
  })
}

export function usePharmacyReport(filters: PharmacyReportFilters) {
  return useQuery({
    queryKey: reportKeys.pharmacy(filters),
    queryFn: () => fetchPharmacyReport(filters),
    placeholderData: (previous) => previous,
  })
}

export function useLaboratoryReport(
  filters: DateReportFilters,
  enabled: boolean,
) {
  return useQuery({
    queryKey: reportKeys.laboratory(filters),
    queryFn: () => fetchLaboratoryReport(filters),
    enabled,
    placeholderData: (previous) => previous,
  })
}

export function useStaffReport(filters: StaffReportFilters) {
  return useQuery({
    queryKey: reportKeys.staff(filters),
    queryFn: () => fetchStaffReport(filters),
    placeholderData: (previous) => previous,
  })
}

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  cancelAppointment,
  createAppointment,
  fetchAppointment,
  fetchAppointments,
  rescheduleAppointment,
  updateAppointment,
  updateAppointmentStatus,
} from './api'
import type {
  AppointmentFilters,
  AppointmentInput,
  AppointmentRescheduleInput,
  AppointmentStatusAction,
  AppointmentUpdate,
} from './types'

export const appointmentKeys = {
  all: ['appointments'] as const,
  lists: () => [...appointmentKeys.all, 'list'] as const,
  list: (filters: AppointmentFilters) =>
    [...appointmentKeys.lists(), filters] as const,
  details: () => [...appointmentKeys.all, 'detail'] as const,
  detail: (id: string) => [...appointmentKeys.details(), id] as const,
}

export function useAppointments(filters: AppointmentFilters) {
  return useQuery({
    queryKey: appointmentKeys.list(filters),
    queryFn: () => fetchAppointments(filters),
    placeholderData: (previous) => previous,
  })
}

export function useAppointment(id: string) {
  return useQuery({
    queryKey: appointmentKeys.detail(id),
    queryFn: () => fetchAppointment(id),
    enabled: Boolean(id),
  })
}

async function invalidateAppointmentQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  ...ids: string[]
) {
  await queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() })
  for (const id of ids) {
    if (id) {
      await queryClient.invalidateQueries({ queryKey: appointmentKeys.detail(id) })
    }
  }
}

export function useCreateAppointment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AppointmentInput) => createAppointment(input),
    onSuccess: async (appointment) => {
      queryClient.setQueryData(appointmentKeys.detail(appointment.id), appointment)
      await invalidateAppointmentQueries(queryClient, appointment.id)
    },
  })
}

export function useUpdateAppointment(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AppointmentUpdate) => updateAppointment(id, input),
    onSuccess: async (appointment) => {
      queryClient.setQueryData(appointmentKeys.detail(id), appointment)
      await invalidateAppointmentQueries(queryClient, id)
    },
  })
}

export function useCancelAppointment(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (cancellationReason: string) =>
      cancelAppointment(id, cancellationReason),
    onSuccess: async (appointment) => {
      queryClient.setQueryData(appointmentKeys.detail(id), appointment)
      await invalidateAppointmentQueries(queryClient, id)
    },
  })
}

export function useRescheduleAppointment(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AppointmentRescheduleInput) =>
      rescheduleAppointment(id, input),
    onSuccess: async (replacement) => {
      queryClient.setQueryData(
        appointmentKeys.detail(replacement.id),
        replacement,
      )
      await invalidateAppointmentQueries(queryClient, id, replacement.id)
    },
  })
}

export function useUpdateAppointmentStatus(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (status: AppointmentStatusAction) =>
      updateAppointmentStatus(id, status),
    onSuccess: async (appointment) => {
      queryClient.setQueryData(appointmentKeys.detail(id), appointment)
      await invalidateAppointmentQueries(queryClient, id)
    },
  })
}

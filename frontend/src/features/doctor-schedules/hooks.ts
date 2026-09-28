import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  createDoctorSchedule,
  fetchDoctorSchedules,
  updateDoctorSchedule,
} from './api'
import type { ScheduleFilters, ScheduleInput, ScheduleUpdate } from './types'

export const doctorScheduleKeys = {
  all: ['doctor-schedules'] as const,
  lists: (doctorId: string) => [...doctorScheduleKeys.all, doctorId] as const,
  list: (doctorId: string, filters: ScheduleFilters) =>
    [...doctorScheduleKeys.lists(doctorId), filters] as const,
}

export function useDoctorSchedules(doctorId: string, filters: ScheduleFilters) {
  return useQuery({
    queryKey: doctorScheduleKeys.list(doctorId, filters),
    queryFn: () => fetchDoctorSchedules(doctorId, filters),
    enabled: Boolean(doctorId),
    placeholderData: (previous) => previous,
  })
}

export function useCreateDoctorSchedule(doctorId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ScheduleInput) => createDoctorSchedule(doctorId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: doctorScheduleKeys.lists(doctorId),
      })
    },
  })
}

export function useUpdateDoctorSchedule(doctorId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      scheduleId,
      input,
    }: {
      scheduleId: string
      input: ScheduleUpdate
    }) => updateDoctorSchedule(doctorId, scheduleId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: doctorScheduleKeys.lists(doctorId),
      })
    },
  })
}

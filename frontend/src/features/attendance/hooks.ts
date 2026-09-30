import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createAttendance,
  fetchAttendance,
  updateAttendance,
} from './api'
import type {
  AttendanceFilters,
  AttendanceInput,
  AttendanceUpdate,
} from './types'

export const attendanceKeys = {
  all: ['attendance'] as const,
  lists: () => [...attendanceKeys.all, 'list'] as const,
  list: (filters: AttendanceFilters) =>
    [...attendanceKeys.lists(), filters] as const,
}

export function useAttendance(filters: AttendanceFilters) {
  return useQuery({
    queryKey: attendanceKeys.list(filters),
    queryFn: () => fetchAttendance(filters),
    placeholderData: (previous) => previous,
  })
}

export function useCreateAttendance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AttendanceInput) => createAttendance(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: attendanceKeys.lists() })
    },
  })
}

export function useUpdateAttendance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AttendanceUpdate }) =>
      updateAttendance(id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: attendanceKeys.lists() })
    },
  })
}

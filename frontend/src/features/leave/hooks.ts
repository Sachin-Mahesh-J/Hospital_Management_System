import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  approveLeave,
  cancelLeave,
  createLeave,
  fetchLeave,
  rejectLeave,
  updateLeave,
} from './api'
import type { LeaveFilters, LeaveInput, LeaveUpdate } from './types'

export const leaveKeys = {
  all: ['leave'] as const,
  lists: () => [...leaveKeys.all, 'list'] as const,
  list: (filters: LeaveFilters) => [...leaveKeys.lists(), filters] as const,
}

export function useLeave(filters: LeaveFilters) {
  return useQuery({
    queryKey: leaveKeys.list(filters),
    queryFn: () => fetchLeave(filters),
    placeholderData: (previous) => previous,
  })
}

export function useCreateLeave() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: LeaveInput) => createLeave(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: leaveKeys.all })
    },
  })
}

export function useUpdateLeave() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: LeaveUpdate }) =>
      updateLeave(id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: leaveKeys.all })
    },
  })
}

export function useApproveLeave() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => approveLeave(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: leaveKeys.all })
    },
  })
}

export function useRejectLeave() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => rejectLeave(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: leaveKeys.all })
    },
  })
}

export function useCancelLeave() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => cancelLeave(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: leaveKeys.all })
    },
  })
}

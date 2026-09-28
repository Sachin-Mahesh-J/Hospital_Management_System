import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { createAdmission, fetchAdmission, fetchAdmissions } from './api'
import type { AdmissionFilters, AdmissionInput } from './types'

export const admissionKeys = {
  all: ['admissions'] as const,
  lists: () => [...admissionKeys.all, 'list'] as const,
  list: (filters: AdmissionFilters) =>
    [...admissionKeys.lists(), filters] as const,
  details: () => [...admissionKeys.all, 'detail'] as const,
  detail: (id: string) => [...admissionKeys.details(), id] as const,
}

export function useAdmissions(filters: AdmissionFilters) {
  return useQuery({
    queryKey: admissionKeys.list(filters),
    queryFn: () => fetchAdmissions(filters),
    placeholderData: (previous) => previous,
  })
}

export function useAdmission(id: string) {
  return useQuery({
    queryKey: admissionKeys.detail(id),
    queryFn: () => fetchAdmission(id),
    enabled: Boolean(id),
  })
}

export function useCreateAdmission() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AdmissionInput) => createAdmission(input),
    onSuccess: async (admission) => {
      queryClient.setQueryData(admissionKeys.detail(admission.id), admission)
      await queryClient.invalidateQueries({ queryKey: admissionKeys.lists() })
    },
  })
}

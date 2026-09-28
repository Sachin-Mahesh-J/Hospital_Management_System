import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { employeeKeys } from '../employees/hooks'
import {
  createDoctor,
  fetchDoctor,
  fetchDoctors,
  updateDoctor,
} from './api'
import type { DoctorFilters, DoctorInput, DoctorUpdate } from './types'

export const doctorKeys = {
  all: ['doctors'] as const,
  lists: () => [...doctorKeys.all, 'list'] as const,
  list: (filters: DoctorFilters) => [...doctorKeys.lists(), filters] as const,
  details: () => [...doctorKeys.all, 'detail'] as const,
  detail: (id: string) => [...doctorKeys.details(), id] as const,
}

export function useDoctors(filters: DoctorFilters) {
  return useQuery({
    queryKey: doctorKeys.list(filters),
    queryFn: () => fetchDoctors(filters),
    placeholderData: (previous) => previous,
  })
}

export function useDoctor(id: string) {
  return useQuery({
    queryKey: doctorKeys.detail(id),
    queryFn: () => fetchDoctor(id),
    enabled: Boolean(id),
  })
}

export function useCreateDoctor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: DoctorInput) => createDoctor(input),
    onSuccess: async (doctor) => {
      queryClient.setQueryData(doctorKeys.detail(doctor.id), doctor)
      await queryClient.invalidateQueries({ queryKey: doctorKeys.lists() })
      await queryClient.invalidateQueries({ queryKey: employeeKeys.lists() })
    },
  })
}

export function useUpdateDoctor(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: DoctorUpdate) => updateDoctor(id, input),
    onSuccess: async (doctor) => {
      queryClient.setQueryData(doctorKeys.detail(id), doctor)
      await queryClient.invalidateQueries({ queryKey: doctorKeys.lists() })
      await queryClient.invalidateQueries({ queryKey: doctorKeys.detail(id) })
    },
  })
}

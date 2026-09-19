import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  createPatient,
  fetchPatient,
  fetchPatients,
  updatePatient,
} from './api'
import type { PatientFilters, PatientInput, PatientUpdate } from './types'

export const patientKeys = {
  all: ['patients'] as const,
  lists: () => [...patientKeys.all, 'list'] as const,
  list: (filters: PatientFilters) =>
    [...patientKeys.lists(), filters] as const,
  details: () => [...patientKeys.all, 'detail'] as const,
  detail: (id: string) => [...patientKeys.details(), id] as const,
}

export function usePatients(filters: PatientFilters) {
  return useQuery({
    queryKey: patientKeys.list(filters),
    queryFn: () => fetchPatients(filters),
    placeholderData: (previous) => previous,
  })
}

export function usePatient(id: string) {
  return useQuery({
    queryKey: patientKeys.detail(id),
    queryFn: () => fetchPatient(id),
    enabled: Boolean(id),
  })
}

export function useCreatePatient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: PatientInput) => createPatient(input),
    onSuccess: async (patient) => {
      queryClient.setQueryData(patientKeys.detail(patient.id), patient)
      await queryClient.invalidateQueries({ queryKey: patientKeys.lists() })
    },
  })
}

export function useUpdatePatient(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: PatientUpdate) => updatePatient(id, input),
    onSuccess: async (patient) => {
      queryClient.setQueryData(patientKeys.detail(id), patient)
      await queryClient.invalidateQueries({ queryKey: patientKeys.lists() })
      await queryClient.invalidateQueries({ queryKey: patientKeys.detail(id) })
    },
  })
}

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { patientKeys } from '../patients/hooks'
import {
  amendMedicalRecord,
  createMedicalRecord,
  fetchMedicalRecord,
  fetchMedicalRecords,
  finalizeMedicalRecord,
  updateMedicalRecord,
} from './api'
import type {
  MedicalRecordAmendment,
  MedicalRecordFilters,
  MedicalRecordInput,
  MedicalRecordUpdate,
} from './types'

export const medicalRecordKeys = {
  all: ['medical-records'] as const,
  lists: () => [...medicalRecordKeys.all, 'list'] as const,
  list: (filters: MedicalRecordFilters) =>
    [...medicalRecordKeys.lists(), filters] as const,
  details: () => [...medicalRecordKeys.all, 'detail'] as const,
  detail: (id: string) => [...medicalRecordKeys.details(), id] as const,
}

export function useMedicalRecords(filters: MedicalRecordFilters) {
  return useQuery({
    queryKey: medicalRecordKeys.list(filters),
    queryFn: () => fetchMedicalRecords(filters),
    placeholderData: (previous) => previous,
  })
}

export function useMedicalRecord(id: string) {
  return useQuery({
    queryKey: medicalRecordKeys.detail(id),
    queryFn: () => fetchMedicalRecord(id),
    enabled: Boolean(id),
  })
}

async function invalidateClinicalQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  ...ids: string[]
) {
  await queryClient.invalidateQueries({ queryKey: medicalRecordKeys.lists() })
  await queryClient.invalidateQueries({ queryKey: patientKeys.details() })
  await queryClient.invalidateQueries({ queryKey: ['prescriptions'] })
  for (const id of ids) {
    if (id) {
      await queryClient.invalidateQueries({ queryKey: medicalRecordKeys.detail(id) })
    }
  }
}

export function useCreateMedicalRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: MedicalRecordInput) => createMedicalRecord(input),
    onSuccess: async (record) => {
      queryClient.setQueryData(medicalRecordKeys.detail(record.id), record)
      await invalidateClinicalQueries(queryClient, record.id)
    },
  })
}

export function useUpdateMedicalRecord(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: MedicalRecordUpdate) => updateMedicalRecord(id, input),
    onSuccess: async (record) => {
      queryClient.setQueryData(medicalRecordKeys.detail(id), record)
      await invalidateClinicalQueries(queryClient, id)
    },
  })
}

export function useFinalizeMedicalRecord(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => finalizeMedicalRecord(id),
    onSuccess: async (record) => {
      queryClient.setQueryData(medicalRecordKeys.detail(id), record)
      await invalidateClinicalQueries(queryClient, id)
    },
  })
}

export function useAmendMedicalRecord(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: MedicalRecordAmendment) => amendMedicalRecord(id, input),
    onSuccess: async (successor) => {
      queryClient.setQueryData(medicalRecordKeys.detail(successor.id), successor)
      await invalidateClinicalQueries(queryClient, id, successor.id)
    },
  })
}

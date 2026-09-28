import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  cancelPrescription,
  createPrescription,
  fetchMedicines,
  fetchPrescription,
  fetchPrescriptions,
} from './api'
import type {
  MedicineFilters,
  PrescriptionFilters,
  PrescriptionInput,
} from './types'

export const prescriptionKeys = {
  all: ['prescriptions'] as const,
  lists: () => [...prescriptionKeys.all, 'list'] as const,
  list: (filters: PrescriptionFilters) =>
    [...prescriptionKeys.lists(), filters] as const,
  details: () => [...prescriptionKeys.all, 'detail'] as const,
  detail: (id: string) => [...prescriptionKeys.details(), id] as const,
}

export const medicineKeys = {
  all: ['medicines'] as const,
  lists: () => [...medicineKeys.all, 'list'] as const,
  list: (filters: MedicineFilters) =>
    [...medicineKeys.lists(), filters] as const,
}

export function usePrescriptions(filters: PrescriptionFilters, enabled = true) {
  return useQuery({
    queryKey: prescriptionKeys.list(filters),
    queryFn: () => fetchPrescriptions(filters),
    enabled,
    placeholderData: (previous) => previous,
  })
}

export function usePrescription(id: string) {
  return useQuery({
    queryKey: prescriptionKeys.detail(id),
    queryFn: () => fetchPrescription(id),
    enabled: Boolean(id),
  })
}

export function useMedicines(filters: MedicineFilters, enabled = true) {
  return useQuery({
    queryKey: medicineKeys.list(filters),
    queryFn: () => fetchMedicines(filters),
    enabled,
    placeholderData: (previous) => previous,
  })
}

async function invalidatePrescriptionQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  ...ids: string[]
) {
  await queryClient.invalidateQueries({ queryKey: prescriptionKeys.lists() })
  await queryClient.invalidateQueries({ queryKey: ['medical-records'] })
  for (const id of ids) {
    if (id) {
      await queryClient.invalidateQueries({ queryKey: prescriptionKeys.detail(id) })
    }
  }
}

export function useCreatePrescription() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: PrescriptionInput) => createPrescription(input),
    onSuccess: async (prescription) => {
      queryClient.setQueryData(prescriptionKeys.detail(prescription.id), prescription)
      await invalidatePrescriptionQueries(queryClient, prescription.id)
    },
  })
}

export function useCancelPrescription(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (cancellationReason: string) =>
      cancelPrescription(id, cancellationReason),
    onSuccess: async (prescription) => {
      queryClient.setQueryData(prescriptionKeys.detail(id), prescription)
      await invalidatePrescriptionQueries(queryClient, id)
    },
  })
}

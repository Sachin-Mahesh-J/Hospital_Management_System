import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  createMedicine,
  deactivateMedicine,
  fetchMedicine,
  fetchMedicines,
  reactivateMedicine,
  updateMedicine,
} from './api'
import type {
  MedicineFilters,
  MedicineInput,
  MedicineUpdate,
} from './types'
import { medicineKeys as prescriptionMedicineKeys } from '../prescriptions/hooks'

export const medicineKeys = {
  all: ['medicines'] as const,
  lists: () => [...medicineKeys.all, 'list'] as const,
  list: (filters: MedicineFilters) =>
    [...medicineKeys.lists(), filters] as const,
  details: () => [...medicineKeys.all, 'detail'] as const,
  detail: (id: string) => [...medicineKeys.details(), id] as const,
}

async function invalidateMedicineQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  id?: string,
) {
  await queryClient.invalidateQueries({ queryKey: medicineKeys.lists() })
  await queryClient.invalidateQueries({ queryKey: prescriptionMedicineKeys.lists() })
  if (id) {
    await queryClient.invalidateQueries({ queryKey: medicineKeys.detail(id) })
  }
}

export function useMedicines(
  filters: MedicineFilters,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: medicineKeys.list(filters),
    queryFn: () => fetchMedicines(filters),
    placeholderData: (previous) => previous,
    enabled: options?.enabled ?? true,
  })
}

export function useMedicine(id: string) {
  return useQuery({
    queryKey: medicineKeys.detail(id),
    queryFn: () => fetchMedicine(id),
    enabled: Boolean(id),
  })
}

export function useCreateMedicine() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: MedicineInput) => createMedicine(input),
    onSuccess: async (medicine) => {
      queryClient.setQueryData(medicineKeys.detail(medicine.id), medicine)
      await invalidateMedicineQueries(queryClient, medicine.id)
    },
  })
}

export function useUpdateMedicine(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: MedicineUpdate) => updateMedicine(id, input),
    onSuccess: async (medicine) => {
      queryClient.setQueryData(medicineKeys.detail(id), medicine)
      await invalidateMedicineQueries(queryClient, id)
    },
  })
}

export function useDeactivateMedicine() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deactivateMedicine(id),
    onSuccess: async (medicine) => {
      queryClient.setQueryData(medicineKeys.detail(medicine.id), medicine)
      await invalidateMedicineQueries(queryClient, medicine.id)
    },
  })
}

export function useReactivateMedicine() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => reactivateMedicine(id),
    onSuccess: async (medicine) => {
      queryClient.setQueryData(medicineKeys.detail(medicine.id), medicine)
      await invalidateMedicineQueries(queryClient, medicine.id)
    },
  })
}

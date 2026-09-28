import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  adjustStock,
  fetchInventory,
  fetchStockMovements,
  receiveStock,
} from './api'
import type {
  AdjustStockInput,
  InventoryFilters,
  MovementFilters,
  ReceiveStockInput,
} from './types'

export const pharmacyKeys = {
  all: ['pharmacy'] as const,
  inventories: () => [...pharmacyKeys.all, 'inventory'] as const,
  inventory: (filters: InventoryFilters) =>
    [...pharmacyKeys.inventories(), filters] as const,
  movements: () => [...pharmacyKeys.all, 'movements'] as const,
  movementList: (filters: MovementFilters) =>
    [...pharmacyKeys.movements(), filters] as const,
}

export function useInventory(filters: InventoryFilters, enabled = true) {
  return useQuery({
    queryKey: pharmacyKeys.inventory(filters),
    queryFn: () => fetchInventory(filters),
    enabled,
    placeholderData: (previous) => previous,
  })
}

export function useStockMovements(filters: MovementFilters, enabled = true) {
  return useQuery({
    queryKey: pharmacyKeys.movementList(filters),
    queryFn: () => fetchStockMovements(filters),
    enabled,
    placeholderData: (previous) => previous,
  })
}

async function invalidatePharmacyStock(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  await queryClient.invalidateQueries({ queryKey: pharmacyKeys.inventories() })
  await queryClient.invalidateQueries({ queryKey: pharmacyKeys.movements() })
}

export function useReceiveStock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ReceiveStockInput) => receiveStock(input),
    onSuccess: async () => {
      await invalidatePharmacyStock(queryClient)
    },
  })
}

export function useAdjustStock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AdjustStockInput) => adjustStock(input),
    onSuccess: async () => {
      await invalidatePharmacyStock(queryClient)
    },
  })
}

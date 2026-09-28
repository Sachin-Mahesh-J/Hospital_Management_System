import { apiClient } from '../../api/client'
import type {
  AdjustStockInput,
  InventoryBatch,
  InventoryFilters,
  InventoryListResult,
  MovementFilters,
  MovementListResult,
  ReceiveStockInput,
  ReceiveStockResult,
  StockMovement,
} from './types'

type PaginatedInventory = {
  data: InventoryBatch[]
  meta: { pagination: InventoryListResult['pagination'] }
}

type PaginatedMovements = {
  data: StockMovement[]
  meta: { pagination: MovementListResult['pagination'] }
}

function inventoryQuery(filters: InventoryFilters): string {
  const params = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize),
  })
  if (filters.medicineId) params.set('medicineId', filters.medicineId)
  if (filters.search) params.set('search', filters.search)
  if (filters.status) params.set('status', filters.status)
  if (filters.sortBy) params.set('sortBy', filters.sortBy)
  if (filters.sortOrder) params.set('sortOrder', filters.sortOrder)
  return params.toString()
}

function movementQuery(filters: MovementFilters): string {
  const params = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize),
  })
  if (filters.medicineId) params.set('medicineId', filters.medicineId)
  if (filters.medicineBatchId) params.set('medicineBatchId', filters.medicineBatchId)
  if (filters.movementType) params.set('movementType', filters.movementType)
  if (filters.sortBy) params.set('sortBy', filters.sortBy)
  if (filters.sortOrder) params.set('sortOrder', filters.sortOrder)
  return params.toString()
}

export async function fetchInventory(
  filters: InventoryFilters,
): Promise<InventoryListResult> {
  const response = await apiClient.getEnvelope<InventoryBatch[]>(
    `/pharmacy/inventory?${inventoryQuery(filters)}`,
  ) as PaginatedInventory
  return { data: response.data, pagination: response.meta.pagination }
}

export async function fetchStockMovements(
  filters: MovementFilters,
): Promise<MovementListResult> {
  const response = await apiClient.getEnvelope<StockMovement[]>(
    `/pharmacy/movements?${movementQuery(filters)}`,
  ) as PaginatedMovements
  return { data: response.data, pagination: response.meta.pagination }
}

export function receiveStock(input: ReceiveStockInput): Promise<ReceiveStockResult> {
  return apiClient.post<ReceiveStockResult>('/pharmacy/receipts', input)
}

export function adjustStock(input: AdjustStockInput): Promise<StockMovement> {
  return apiClient.post<StockMovement>('/pharmacy/adjustments', input)
}

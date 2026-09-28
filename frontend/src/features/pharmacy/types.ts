export const batchStatuses = [
  'active',
  'depleted',
  'expired',
  'quarantined',
] as const
export type BatchStatus = (typeof batchStatuses)[number]

export const stockMovementTypes = [
  'receipt',
  'dispense',
  'adjustment',
  'return',
  'disposal',
] as const
export type StockMovementType = (typeof stockMovementTypes)[number]

export type PharmacyMedicine = {
  id: string
  code: string
  genericName: string
  brandName: string | null
  dosageForm: string
  strength: string | null
  inventoryUnit: string
  status: string
  currency: string
}

export type InventoryBatch = {
  id: string
  medicineId: string
  batchNumber: string
  expiryDate: string
  receivedQuantity: string
  availableQuantity: string
  status: string
  receivedAt: string
  createdAt: string
  updatedAt: string
  medicine: PharmacyMedicine
}

export type StockMovement = {
  id: string
  medicineBatchId: string
  movementType: StockMovementType
  quantity: string
  occurredAt: string
  reason: string
  referenceIdentifier: string | null
  dispenseRecordId: string | null
  dispenseReversalId: string | null
  medicineBatch: {
    id: string
    batchNumber: string
    expiryDate: string
    status: string
    medicine: PharmacyMedicine
  }
  performedBy: {
    id: string
    username: string
  }
}

export type Pagination = {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export type InventoryFilters = {
  page: number
  pageSize: number
  medicineId?: string
  search?: string
  status?: BatchStatus
  sortBy?: 'genericName' | 'expiryDate' | 'batchNumber' | 'receivedAt'
  sortOrder?: 'asc' | 'desc'
}

export type MovementFilters = {
  page: number
  pageSize: number
  medicineId?: string
  medicineBatchId?: string
  movementType?: StockMovementType
  sortBy?: 'occurredAt' | 'movementType'
  sortOrder?: 'asc' | 'desc'
}

export type InventoryListResult = {
  data: InventoryBatch[]
  pagination: Pagination
}

export type MovementListResult = {
  data: StockMovement[]
  pagination: Pagination
}

export type ReceiveStockInput = {
  medicineId: string
  batchNumber: string
  expiryDate: string
  quantity: string
  unitCost: string
  salePriceSnapshot: string
  currency: string
}

export type ReceiveStockResult = {
  batch: InventoryBatch
  movementId: string
}

export type AdjustStockInput = {
  medicineBatchId: string
  quantity: string
  reason: string
}

export function medicineLabel(medicine: PharmacyMedicine): string {
  const brand = medicine.brandName ? ` (${medicine.brandName})` : ''
  return `${medicine.genericName}${brand} — ${medicine.code}`
}

export function batchLabel(batch: InventoryBatch): string {
  return `${medicineLabel(batch.medicine)} / ${batch.batchNumber}`
}

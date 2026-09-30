export const medicineStatuses = ['active', 'inactive'] as const

export type MedicineStatus = (typeof medicineStatuses)[number]

export type Medicine = {
  id: string
  code: string
  genericName: string
  brandName: string | null
  dosageForm: string
  strength: string | null
  inventoryUnit: string
  defaultSalePrice: string
  currency: string
  lowStockThreshold: string
  status: MedicineStatus
  createdAt: string
  updatedAt: string
}

export type MedicineInput = {
  code: string
  genericName: string
  brandName?: string | null
  dosageForm: string
  strength?: string | null
  inventoryUnit: string
  defaultSalePrice?: string
  currency: string
  lowStockThreshold?: string
}

export type MedicineUpdate = Partial<MedicineInput>

export type MedicineFilters = {
  page: number
  pageSize: number
  search?: string
  status?: MedicineStatus
  sortBy?: 'code' | 'genericName' | 'status' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

export type MedicineListResult = {
  data: Medicine[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}

export function medicineLabel(medicine: Pick<Medicine, 'code' | 'genericName' | 'brandName'>): string {
  const brand = medicine.brandName ? ` (${medicine.brandName})` : ''
  return `${medicine.genericName}${brand} — ${medicine.code}`
}

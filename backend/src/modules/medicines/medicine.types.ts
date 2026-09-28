import type { Medicine } from '@prisma/client'

export type MedicineCatalogDto = {
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

export function toMedicineCatalogDto(medicine: Medicine): MedicineCatalogDto {
  return {
    id: medicine.id,
    code: medicine.code,
    genericName: medicine.genericName,
    brandName: medicine.brandName,
    dosageForm: medicine.dosageForm,
    strength: medicine.strength,
    inventoryUnit: medicine.inventoryUnit,
    status: medicine.status,
    currency: medicine.currency,
  }
}

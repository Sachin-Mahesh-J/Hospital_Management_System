import { listActiveMedicines } from './medicine.repository.js'
import type { ListMedicinesQuery } from './medicine.schemas.js'
import {
  toMedicineCatalogDto,
  type MedicineCatalogDto,
} from './medicine.types.js'

export async function getActiveMedicines(query: ListMedicinesQuery): Promise<{
  data: MedicineCatalogDto[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}> {
  const result = await listActiveMedicines(query)
  return {
    data: result.medicines.map(toMedicineCatalogDto),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      totalItems: result.totalItems,
      totalPages: Math.ceil(result.totalItems / query.pageSize),
    },
  }
}

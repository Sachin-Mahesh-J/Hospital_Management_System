import { Prisma } from '@prisma/client'
import { database } from '../../database/database.service.js'
import type { ListMedicinesQuery } from './medicine.schemas.js'

export async function listActiveMedicines(query: ListMedicinesQuery) {
  const where: Prisma.MedicineWhereInput = {
    status: 'active',
    ...(query.search
      ? {
          OR: [
            { code: { contains: query.search, mode: 'insensitive' } },
            { genericName: { contains: query.search, mode: 'insensitive' } },
            { brandName: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  }
  const totalItems = await database.client.medicine.count({ where })
  const offset = (query.page - 1) * query.pageSize
  const medicines =
    offset >= totalItems
      ? []
      : await database.client.medicine.findMany({
          where,
          skip: offset,
          take: query.pageSize,
          orderBy: [{ [query.sortBy]: query.sortOrder }, { id: 'asc' }],
        })
  return { medicines, totalItems }
}

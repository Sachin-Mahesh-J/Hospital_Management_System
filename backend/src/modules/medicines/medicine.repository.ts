import { Prisma, type Medicine } from '@prisma/client'
import { database } from '../../database/database.service.js'
import type {
  CreateMedicineBody,
  ListMedicinesQuery,
  UpdateMedicineBody,
} from './medicine.schemas.js'

type MedicineClient = Pick<Prisma.TransactionClient, 'medicine'>

function clientOrDefault(client?: MedicineClient): MedicineClient {
  return client ?? database.client
}

function medicineWhere(query: ListMedicinesQuery): Prisma.MedicineWhereInput {
  const search = query.search?.trim()
  return {
    ...(query.status ? { status: query.status } : {}),
    ...(search
      ? {
          OR: [
            { code: { contains: search, mode: 'insensitive' } },
            { genericName: { contains: search, mode: 'insensitive' } },
            { brandName: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  }
}

export async function listMedicines(query: ListMedicinesQuery): Promise<{
  medicines: Medicine[]
  totalItems: number
}> {
  const where = medicineWhere(query)
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

export function findMedicineById(
  id: string,
  client?: MedicineClient,
): Promise<Medicine | null> {
  return clientOrDefault(client).medicine.findUnique({ where: { id } })
}

export function createMedicine(
  input: CreateMedicineBody,
  client?: MedicineClient,
): Promise<Medicine> {
  return clientOrDefault(client).medicine.create({
    data: {
      code: input.code,
      genericName: input.genericName,
      brandName: input.brandName ?? null,
      dosageForm: input.dosageForm,
      strength: input.strength ?? null,
      inventoryUnit: input.inventoryUnit,
      defaultSalePrice: input.defaultSalePrice ?? '0',
      currency: input.currency,
      lowStockThreshold: input.lowStockThreshold ?? '0',
      status: 'active',
    },
  })
}

export function updateMedicine(
  id: string,
  input: UpdateMedicineBody,
  client?: MedicineClient,
): Promise<Medicine> {
  const data: Prisma.MedicineUpdateInput = { updatedAt: new Date() }
  if (input.code !== undefined) data.code = input.code
  if (input.genericName !== undefined) data.genericName = input.genericName
  if (input.brandName !== undefined) data.brandName = input.brandName
  if (input.dosageForm !== undefined) data.dosageForm = input.dosageForm
  if (input.strength !== undefined) data.strength = input.strength
  if (input.inventoryUnit !== undefined) data.inventoryUnit = input.inventoryUnit
  if (input.defaultSalePrice !== undefined) {
    data.defaultSalePrice = input.defaultSalePrice
  }
  if (input.currency !== undefined) data.currency = input.currency
  if (input.lowStockThreshold !== undefined) {
    data.lowStockThreshold = input.lowStockThreshold
  }
  return clientOrDefault(client).medicine.update({ where: { id }, data })
}

export function updateMedicineStatus(
  id: string,
  status: 'active' | 'inactive',
  client?: MedicineClient,
): Promise<Medicine> {
  return clientOrDefault(client).medicine.update({
    where: { id },
    data: { status, updatedAt: new Date() },
  })
}

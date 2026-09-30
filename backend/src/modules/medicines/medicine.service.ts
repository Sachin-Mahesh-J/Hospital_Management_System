import { database } from '../../database/database.service.js'
import { isUniqueConstraint } from '../../database/prismaErrors.js'
import { ConflictError, NotFoundError } from '../../errors/httpErrors.js'
import { writeAudit } from '../audit/audit.service.js'
import {
  createMedicine as createMedicineRecord,
  findMedicineById,
  listMedicines as listMedicineRecords,
  updateMedicine as updateMedicineRecord,
  updateMedicineStatus,
} from './medicine.repository.js'
import type {
  CreateMedicineBody,
  ListMedicinesQuery,
  UpdateMedicineBody,
} from './medicine.schemas.js'
import { toMedicineCatalogDto, type MedicineCatalogDto } from './medicine.types.js'

type MutationContext = {
  actorUserId: string
  requestId: string
}

function mapMedicineConflict(error: unknown): never {
  if (isUniqueConstraint(error, ['uq_medicines_code', 'code'])) {
    throw new ConflictError('A medicine with this code already exists.')
  }
  throw error
}

export async function getMedicines(query: ListMedicinesQuery): Promise<{
  data: MedicineCatalogDto[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}> {
  const result = await listMedicineRecords(query)
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

export async function getMedicine(id: string): Promise<MedicineCatalogDto> {
  const medicine = await findMedicineById(id)
  if (!medicine) throw new NotFoundError('Medicine was not found.')
  return toMedicineCatalogDto(medicine)
}

export async function registerMedicine(
  input: CreateMedicineBody,
  context: MutationContext,
): Promise<MedicineCatalogDto> {
  try {
    const medicine = await database.client.$transaction(async (transaction) => {
      const created = await createMedicineRecord(input, transaction)
      await writeAudit(
        {
          actorUserId: context.actorUserId,
          action: 'medicine.create',
          resourceType: 'medicine',
          resourceId: created.id,
          outcome: 'success',
          requestId: context.requestId,
          metadata: { fields: Object.keys(input).sort() },
        },
        transaction,
      )
      return created
    })
    return toMedicineCatalogDto(medicine)
  } catch (error) {
    mapMedicineConflict(error)
  }
}

export async function changeMedicine(
  id: string,
  input: UpdateMedicineBody,
  context: MutationContext,
): Promise<MedicineCatalogDto> {
  try {
    const medicine = await database.client.$transaction(async (transaction) => {
      const existing = await findMedicineById(id, transaction)
      if (!existing) throw new NotFoundError('Medicine was not found.')

      const updated = await updateMedicineRecord(id, input, transaction)
      await writeAudit(
        {
          actorUserId: context.actorUserId,
          action: 'medicine.update',
          resourceType: 'medicine',
          resourceId: id,
          outcome: 'success',
          requestId: context.requestId,
          metadata: { fields: Object.keys(input).sort() },
        },
        transaction,
      )
      return updated
    })
    return toMedicineCatalogDto(medicine)
  } catch (error) {
    mapMedicineConflict(error)
  }
}

export async function deactivateMedicine(
  id: string,
  context: MutationContext,
): Promise<MedicineCatalogDto> {
  const medicine = await database.client.$transaction(async (transaction) => {
    const existing = await findMedicineById(id, transaction)
    if (!existing) throw new NotFoundError('Medicine was not found.')
    if (existing.status === 'inactive') return existing
    const updated = await updateMedicineStatus(id, 'inactive', transaction)
    await writeAudit(
      {
        actorUserId: context.actorUserId,
        action: 'medicine.deactivate',
        resourceType: 'medicine',
        resourceId: id,
        outcome: 'success',
        requestId: context.requestId,
        metadata: { fields: ['status'] },
      },
      transaction,
    )
    return updated
  })
  return toMedicineCatalogDto(medicine)
}

export async function reactivateMedicine(
  id: string,
  context: MutationContext,
): Promise<MedicineCatalogDto> {
  const medicine = await database.client.$transaction(async (transaction) => {
    const existing = await findMedicineById(id, transaction)
    if (!existing) throw new NotFoundError('Medicine was not found.')
    if (existing.status === 'active') return existing
    const updated = await updateMedicineStatus(id, 'active', transaction)
    await writeAudit(
      {
        actorUserId: context.actorUserId,
        action: 'medicine.reactivate',
        resourceType: 'medicine',
        resourceId: id,
        outcome: 'success',
        requestId: context.requestId,
        metadata: { fields: ['status'] },
      },
      transaction,
    )
    return updated
  })
  return toMedicineCatalogDto(medicine)
}

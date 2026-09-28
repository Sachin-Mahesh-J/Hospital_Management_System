import { Prisma } from '@prisma/client'
import { findEmployeeByUserId } from '../../auth/clinicalIdentity.js'
import { isBatchExpired } from '../../config/hospitalTime.js'
import { database } from '../../database/database.service.js'
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../errors/httpErrors.js'
import { writeAudit } from '../audit/audit.service.js'
import { findPrescriptionById } from '../prescriptions/prescription.repository.js'
import {
  toPrescriptionDetailDto,
  type PrescriptionDetailDto,
} from '../prescriptions/prescription.types.js'
import {
  aggregatePharmacyPrescriptionStatus,
  minDecimal,
  remainingQuantity,
  toDecimal,
} from './pharmacy.lifecycle.js'
import {
  createAdjustmentMovement,
  createDispense,
  createDispenseReversal,
  createReceivedBatch,
  effectiveDispensedQuantity,
  findBatchByMedicineAndNumber,
  findDispenseForUpdate,
  listDispenseMovements,
  listInventory,
  listItemEffectiveTotals,
  listStockMovements,
  lockActiveBatchesForMedicine,
  lockBatch,
  lockMedicine,
  lockPrescription,
  lockPrescriptionItems,
  batchAvailableQuantity,
  updatePrescriptionStatus,
  type InventoryRow,
} from './pharmacy.repository.js'
import type {
  AdjustStockBody,
  DispenseItemBody,
  ListInventoryQuery,
  ListMovementsQuery,
  ReceiveStockBody,
  ReverseDispenseBody,
} from './pharmacy.schemas.js'
import {
  toInventoryBatchDto,
  toStockMovementDto,
  type InventoryBatchDto,
  type ReceiveStockResultDto,
  type StockMovementDto,
} from './pharmacy.types.js'

type MutationContext = {
  actorUserId: string
  requestId: string
}

type Pagination = {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

function paginationFor(page: number, pageSize: number, totalItems: number): Pagination {
  return {
    page,
    pageSize,
    totalItems,
    totalPages: Math.ceil(totalItems / pageSize),
  }
}

function inventoryDtoFromRow(row: InventoryRow): InventoryBatchDto {
  return {
    id: row.id,
    medicineId: row.medicine_id,
    batchNumber: row.batch_number,
    expiryDate: row.expiry_date.toISOString().slice(0, 10),
    receivedQuantity: toDecimal(row.received_quantity).toString(),
    availableQuantity: toDecimal(row.available_quantity).toString(),
    status: row.status,
    receivedAt: row.received_at.toISOString(),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    medicine: {
      id: row.medicine_id,
      code: row.code,
      genericName: row.generic_name,
      brandName: row.brand_name,
      dosageForm: row.dosage_form,
      strength: row.strength,
      inventoryUnit: row.inventory_unit,
      status: row.medicine_status,
      currency: row.currency,
    },
  }
}

async function requireActiveEmployee(
  userId: string,
  client: Prisma.TransactionClient,
): Promise<string> {
  const employee = await findEmployeeByUserId(userId, client)
  if (!employee) {
    throw new ConflictError(
      'The authenticated user is not linked to an employee record.',
    )
  }
  if (employee.employmentStatus !== 'active') {
    throw new ConflictError('This employee is not available for pharmacy work.')
  }
  return employee.id
}

async function requirePrescriptionDetail(id: string): Promise<PrescriptionDetailDto> {
  const prescription = await findPrescriptionById(id)
  if (!prescription) {
    throw new NotFoundError('Prescription was not found.')
  }
  return toPrescriptionDetailDto(prescription)
}

async function recalculatePrescriptionStatus(
  prescriptionId: string,
  client: Prisma.TransactionClient,
): Promise<string> {
  const items = await listItemEffectiveTotals(prescriptionId, client)
  const status = aggregatePharmacyPrescriptionStatus(
    items.map((item) => ({
      quantityPrescribed: item.quantity_prescribed,
      effectiveDispensed: item.effective_dispensed,
    })),
  )
  await updatePrescriptionStatus(prescriptionId, status, client)
  return status
}

export async function getInventory(query: ListInventoryQuery): Promise<{
  data: InventoryBatchDto[]
  pagination: Pagination
}> {
  const result = await listInventory(query)
  return {
    data: result.rows.map(inventoryDtoFromRow),
    pagination: paginationFor(query.page, query.pageSize, result.totalItems),
  }
}

export async function getStockMovements(query: ListMovementsQuery): Promise<{
  data: StockMovementDto[]
  pagination: Pagination
}> {
  const result = await listStockMovements(query)
  return {
    data: result.movements.map(toStockMovementDto),
    pagination: paginationFor(query.page, query.pageSize, result.totalItems),
  }
}

export async function receiveStock(
  input: ReceiveStockBody,
  context: MutationContext,
): Promise<ReceiveStockResultDto> {
  try {
    const result = await database.client.$transaction(async (transaction) => {
      const medicine = await lockMedicine(input.medicineId, transaction)
      if (!medicine) throw new NotFoundError('Medicine was not found.')
      if (medicine.status !== 'active') {
        throw new ConflictError('Inactive medicines cannot be received.')
      }
      if (input.currency !== medicine.currency) {
        throw new ValidationError(
          'Receiving currency must match the medicine catalog currency.',
          [
            {
              path: 'body.currency',
              message:
                'Receiving currency must match the medicine catalog currency.',
            },
          ],
        )
      }
      const existing = await findBatchByMedicineAndNumber(
        input.medicineId,
        input.batchNumber,
        transaction,
      )
      if (existing) {
        throw new ConflictError(
          'A batch with this number already exists for this medicine.',
        )
      }

      const created = await createReceivedBatch(
        input,
        context.actorUserId,
        transaction,
      )
      await writeAudit(
        {
          actorUserId: context.actorUserId,
          action: 'stock.receive',
          resourceType: 'medicine_batch',
          resourceId: created.batch.id,
          outcome: 'success',
          requestId: context.requestId,
          metadata: {
            medicineId: input.medicineId,
            batchId: created.batch.id,
            movementId: created.movementId,
            quantity: input.quantity,
            movementType: 'receipt',
          },
        },
        transaction,
      )
      return created
    })
    return {
      batch: toInventoryBatchDto(result.batch, input.quantity),
      movementId: result.movementId,
    }
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictError(
        'A batch with this number already exists for this medicine.',
      )
    }
    throw error
  }
}

export async function adjustStock(
  input: AdjustStockBody,
  context: MutationContext,
): Promise<StockMovementDto> {
  const movement = await database.client.$transaction(async (transaction) => {
    const locked = await lockBatch(input.medicineBatchId, transaction)
    if (!locked) throw new NotFoundError('Medicine batch was not found.')

    const quantity = toDecimal(input.quantity)
    if (quantity.lt(0)) {
      const available = await batchAvailableQuantity(
        input.medicineBatchId,
        transaction,
      )
      if (available.add(quantity).lt(0)) {
        throw new ConflictError(
          'Adjustment would reduce available stock below zero.',
        )
      }
    }

    const created = await createAdjustmentMovement(
      input,
      context.actorUserId,
      transaction,
    )
    await writeAudit(
      {
        actorUserId: context.actorUserId,
        action: 'stock.adjust',
        resourceType: 'stock_movement',
        resourceId: created.id,
        outcome: 'success',
        requestId: context.requestId,
        metadata: {
          medicineId: locked.medicineId,
          batchId: locked.id,
          movementId: created.id,
          quantity: input.quantity,
          movementType: 'adjustment',
        },
      },
      transaction,
    )
    return created
  })
  return toStockMovementDto(movement)
}

export async function dispensePrescriptionItem(
  prescriptionId: string,
  itemId: string,
  input: DispenseItemBody,
  context: MutationContext,
): Promise<PrescriptionDetailDto> {
  await database.client.$transaction(async (transaction) => {
    const employeeId = await requireActiveEmployee(
      context.actorUserId,
      transaction,
    )
    const lockedPrescription = await lockPrescription(prescriptionId, transaction)
    if (!lockedPrescription) {
      throw new NotFoundError('Prescription was not found.')
    }
    if (lockedPrescription.status === 'cancelled') {
      throw new ConflictError('Cancelled prescriptions cannot be dispensed.')
    }
    if (lockedPrescription.status === 'dispensed') {
      throw new ConflictError('This prescription has already been fully dispensed.')
    }
    if (
      lockedPrescription.status !== 'active' &&
      lockedPrescription.status !== 'partially_dispensed'
    ) {
      throw new ConflictError('This prescription cannot be dispensed.')
    }

    const items = await lockPrescriptionItems(prescriptionId, transaction)
    const item = items.find((row) => row.id === itemId)
    if (!item) {
      throw new NotFoundError('Prescription item was not found.')
    }

    const medicine = await lockMedicine(item.medicine_id, transaction)
    if (!medicine) throw new NotFoundError('Medicine was not found.')
    if (medicine.status !== 'active') {
      throw new ConflictError('Inactive medicines cannot be newly dispensed.')
    }

    const effective = await effectiveDispensedQuantity(item.id, transaction)
    const remaining = remainingQuantity(item.quantity_prescribed, effective)
    const requested = toDecimal(input.quantity)
    if (requested.gt(remaining)) {
      throw new ConflictError(
        'Requested quantity exceeds the remaining prescribed quantity.',
      )
    }

    const lockedBatches = await lockActiveBatchesForMedicine(
      item.medicine_id,
      transaction,
    )
    const eligible = lockedBatches
      .filter((batch) => !isBatchExpired(batch.expiry_date))
      .sort((left, right) => {
        const expiryCompare = left.expiry_date.getTime() - right.expiry_date.getTime()
        return expiryCompare !== 0 ? expiryCompare : left.id.localeCompare(right.id)
      })

    const allocations: Array<{ medicineBatchId: string; quantity: Prisma.Decimal }> =
      []
    let outstanding = requested
    for (const batch of eligible) {
      if (outstanding.lte(0)) break
      const available = await batchAvailableQuantity(batch.id, transaction)
      if (available.lte(0)) continue
      const take = minDecimal(outstanding, available)
      allocations.push({ medicineBatchId: batch.id, quantity: take })
      outstanding = outstanding.minus(take)
    }

    if (allocations.length === 0 || requested.lte(0)) {
      throw new ConflictError('No available stock for this medicine.')
    }
    if (outstanding.gt(0)) {
      throw new ConflictError('Requested quantity exceeds available stock.')
    }

    const dispense = await createDispense(
      {
        prescriptionItemId: item.id,
        quantity: input.quantity,
        unit: item.unit,
        note: input.note ?? null,
        dispensedByEmployeeId: employeeId,
        allocations,
        actorUserId: context.actorUserId,
        prescriptionId,
      },
      transaction,
    )
    const nextStatus = await recalculatePrescriptionStatus(
      prescriptionId,
      transaction,
    )
    await writeAudit(
      {
        actorUserId: context.actorUserId,
        action: 'prescription.dispense',
        resourceType: 'dispense_record',
        resourceId: dispense.id,
        outcome: 'success',
        requestId: context.requestId,
        metadata: {
          prescriptionId,
          prescriptionItemId: item.id,
          dispenseId: dispense.id,
          employeeId,
          quantity: input.quantity,
          movementType: 'dispense',
          batchCount: allocations.length,
          fromStatus: lockedPrescription.status,
          toStatus: nextStatus,
        },
      },
      transaction,
    )
  })
  return requirePrescriptionDetail(prescriptionId)
}

export async function reverseDispense(
  prescriptionId: string,
  dispenseId: string,
  input: ReverseDispenseBody,
  context: MutationContext,
): Promise<PrescriptionDetailDto> {
  try {
    await database.client.$transaction(async (transaction) => {
    const lockedPrescription = await lockPrescription(prescriptionId, transaction)
    if (!lockedPrescription) {
      throw new NotFoundError('Prescription was not found.')
    }
    await lockPrescriptionItems(prescriptionId, transaction)

    const rows = await findDispenseForUpdate(
      dispenseId,
      prescriptionId,
      transaction,
    )
    const dispense = rows[0]
    if (!dispense) throw new NotFoundError('Dispense record was not found.')
    if (dispense.reversal_id) {
      throw new ConflictError('This dispense has already been reversed.')
    }

    const originalMovements = await listDispenseMovements(dispense.id, transaction)
    const batchIds = [
      ...new Set(originalMovements.map((movement) => movement.medicineBatchId)),
    ].sort()
    for (const batchId of batchIds) {
      const locked = await lockBatch(batchId, transaction)
      if (!locked) throw new NotFoundError('Medicine batch was not found.')
    }

    const reversal = await createDispenseReversal(
      {
        dispenseRecordId: dispense.id,
        quantityReversed: dispense.quantity_dispensed,
        reason: input.reason,
        reversedByUserId: context.actorUserId,
        originalMovements: originalMovements.map((movement) => ({
          medicineBatchId: movement.medicineBatchId,
          quantity: toDecimal(movement.quantity),
        })),
      },
      transaction,
    )
    const nextStatus = await recalculatePrescriptionStatus(
      prescriptionId,
      transaction,
    )
    await writeAudit(
      {
        actorUserId: context.actorUserId,
        action: 'prescription.reverse',
        resourceType: 'dispense_reversal',
        resourceId: reversal.id,
        outcome: 'success',
        requestId: context.requestId,
        metadata: {
          prescriptionId,
          prescriptionItemId: dispense.prescription_item_id,
          dispenseId: dispense.id,
          reversalId: reversal.id,
          quantity: toDecimal(dispense.quantity_dispensed).toString(),
          movementType: 'return',
          batchCount: originalMovements.length,
          fromStatus: lockedPrescription.status,
          toStatus: nextStatus,
        },
      },
      transaction,
    )
    })
    return requirePrescriptionDetail(prescriptionId)
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictError('This dispense has already been reversed.')
    }
    throw error
  }
}

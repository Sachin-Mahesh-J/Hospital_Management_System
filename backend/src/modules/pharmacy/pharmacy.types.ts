import type {
  Employee,
  Medicine,
  MedicineBatch,
  StockMovement,
  User,
} from '@prisma/client'
import { calendarDateUtc } from '../../config/hospitalTime.js'
import { decimalString } from './pharmacy.lifecycle.js'

export type MedicineSummary = {
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

export type InventoryBatchDto = {
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
  medicine: MedicineSummary
}

export type StockMovementDto = {
  id: string
  medicineBatchId: string
  movementType: string
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
    medicine: MedicineSummary
  }
  performedBy: {
    id: string
    username: string
  }
}

export type ReceiveStockResultDto = {
  batch: InventoryBatchDto
  movementId: string
}

function medicineSummary(
  medicine: Pick<
    Medicine,
    | 'id'
    | 'code'
    | 'genericName'
    | 'brandName'
    | 'dosageForm'
    | 'strength'
    | 'inventoryUnit'
    | 'status'
    | 'currency'
  >,
): MedicineSummary {
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

export function toInventoryBatchDto(
  batch: MedicineBatch & { medicine: Medicine },
  availableQuantity: string | number,
): InventoryBatchDto {
  return {
    id: batch.id,
    medicineId: batch.medicineId,
    batchNumber: batch.batchNumber,
    expiryDate: calendarDateUtc(batch.expiryDate),
    receivedQuantity: decimalString(batch.receivedQuantity),
    availableQuantity: decimalString(availableQuantity),
    status: batch.status,
    receivedAt: batch.receivedAt.toISOString(),
    createdAt: batch.createdAt.toISOString(),
    updatedAt: batch.updatedAt.toISOString(),
    medicine: medicineSummary(batch.medicine),
  }
}

export function toStockMovementDto(
  movement: StockMovement & {
    medicineBatch: MedicineBatch & { medicine: Medicine }
    performedBy: Pick<User, 'id' | 'username'>
  },
): StockMovementDto {
  return {
    id: movement.id,
    medicineBatchId: movement.medicineBatchId,
    movementType: movement.movementType,
    quantity: decimalString(movement.quantity),
    occurredAt: movement.occurredAt.toISOString(),
    reason: movement.reason,
    referenceIdentifier: movement.referenceIdentifier,
    dispenseRecordId: movement.dispenseRecordId,
    dispenseReversalId: movement.dispenseReversalId,
    medicineBatch: {
      id: movement.medicineBatch.id,
      batchNumber: movement.medicineBatch.batchNumber,
      expiryDate: calendarDateUtc(movement.medicineBatch.expiryDate),
      status: movement.medicineBatch.status,
      medicine: medicineSummary(movement.medicineBatch.medicine),
    },
    performedBy: {
      id: movement.performedBy.id,
      username: movement.performedBy.username,
    },
  }
}

export type DispensingEmployee = Pick<
  Employee,
  'id' | 'employeeNumber' | 'firstName' | 'lastName' | 'employmentStatus'
>

import { Prisma } from '@prisma/client'
import { database } from '../../database/database.service.js'
import type {
  AdjustStockBody,
  DispenseItemBody,
  ListInventoryQuery,
  ListMovementsQuery,
  ReceiveStockBody,
} from './pharmacy.schemas.js'

type PharmacyClient = Prisma.TransactionClient

function clientOrDefault(client?: PharmacyClient): PharmacyClient {
  return client ?? database.client
}

const movementInclude = {
  medicineBatch: { include: { medicine: true } },
  performedBy: { select: { id: true, username: true } },
} as const

const batchInclude = { medicine: true } as const

const inventorySortColumn: Record<
  ListInventoryQuery['sortBy'],
  Prisma.Sql
> = {
  genericName: Prisma.sql`m."generic_name"`,
  expiryDate: Prisma.sql`b."expiry_date"`,
  batchNumber: Prisma.sql`b."batch_number"`,
  receivedAt: Prisma.sql`b."received_at"`,
}

export type InventoryRow = {
  id: string
  medicine_id: string
  batch_number: string
  expiry_date: Date
  received_quantity: Prisma.Decimal
  status: string
  received_at: Date
  created_at: Date
  updated_at: Date
  available_quantity: Prisma.Decimal
  code: string
  generic_name: string
  brand_name: string | null
  dosage_form: string
  strength: string | null
  inventory_unit: string
  medicine_status: string
  currency: string
}

function inventoryFilters(query: ListInventoryQuery): Prisma.Sql {
  const parts: Prisma.Sql[] = [Prisma.sql`TRUE`]
  if (query.medicineId) {
    parts.push(Prisma.sql`b."medicine_id" = ${query.medicineId}::uuid`)
  }
  if (query.status) {
    parts.push(Prisma.sql`b."status" = ${query.status}`)
  }
  if (query.search) {
    const term = `%${query.search}%`
    parts.push(Prisma.sql`(
      m."code" ILIKE ${term}
      OR m."generic_name" ILIKE ${term}
      OR COALESCE(m."brand_name", '') ILIKE ${term}
      OR b."batch_number" ILIKE ${term}
    )`)
  }
  return Prisma.join(parts, ' AND ')
}

export async function listInventory(query: ListInventoryQuery): Promise<{
  rows: InventoryRow[]
  totalItems: number
}> {
  const where = inventoryFilters(query)
  const countRows = await database.client.$queryRaw<Array<{ total: bigint }>>`
    SELECT COUNT(*)::bigint AS total
    FROM "medicine_batches" b
    INNER JOIN "medicines" m ON m."id" = b."medicine_id"
    WHERE ${where}
  `
  const totalItems = Number(countRows[0]?.total ?? 0)
  const offset = (query.page - 1) * query.pageSize
  if (offset >= totalItems) {
    return { rows: [], totalItems }
  }

  const sortColumn = inventorySortColumn[query.sortBy]
  const sortDirection =
    query.sortOrder === 'desc' ? Prisma.sql`DESC` : Prisma.sql`ASC`

  const rows = await database.client.$queryRaw<InventoryRow[]>`
    SELECT
      b."id",
      b."medicine_id",
      b."batch_number",
      b."expiry_date",
      b."received_quantity",
      b."status",
      b."received_at",
      b."created_at",
      b."updated_at",
      COALESCE(SUM(sm."quantity"), 0) AS available_quantity,
      m."code",
      m."generic_name",
      m."brand_name",
      m."dosage_form",
      m."strength",
      m."inventory_unit",
      m."status" AS medicine_status,
      m."currency"
    FROM "medicine_batches" b
    INNER JOIN "medicines" m ON m."id" = b."medicine_id"
    LEFT JOIN "stock_movements" sm ON sm."medicine_batch_id" = b."id"
    WHERE ${where}
    GROUP BY b."id", m."id"
    ORDER BY ${sortColumn} ${sortDirection}, b."id" ASC
    OFFSET ${offset}
    LIMIT ${query.pageSize}
  `
  return { rows, totalItems }
}

export async function listStockMovements(query: ListMovementsQuery) {
  const where: Prisma.StockMovementWhereInput = {
    ...(query.medicineId
      ? { medicineBatch: { medicineId: query.medicineId } }
      : {}),
    ...(query.medicineBatchId ? { medicineBatchId: query.medicineBatchId } : {}),
    ...(query.movementType ? { movementType: query.movementType } : {}),
    ...(query.occurredAtFrom || query.occurredAtTo
      ? {
          occurredAt: {
            ...(query.occurredAtFrom
              ? { gte: new Date(query.occurredAtFrom) }
              : {}),
            ...(query.occurredAtTo ? { lt: new Date(query.occurredAtTo) } : {}),
          },
        }
      : {}),
  }
  const totalItems = await database.client.stockMovement.count({ where })
  const offset = (query.page - 1) * query.pageSize
  const movements =
    offset >= totalItems
      ? []
      : await database.client.stockMovement.findMany({
          where,
          skip: offset,
          take: query.pageSize,
          include: movementInclude,
          orderBy: [{ [query.sortBy]: query.sortOrder }, { id: 'asc' }],
        })
  return { movements, totalItems }
}

export function findMedicineById(id: string, client?: PharmacyClient) {
  return clientOrDefault(client).medicine.findUnique({
    where: { id },
  })
}

export function findBatchByMedicineAndNumber(
  medicineId: string,
  batchNumber: string,
  client?: PharmacyClient,
) {
  return clientOrDefault(client).medicineBatch.findUnique({
    where: {
      medicineId_batchNumber: { medicineId, batchNumber },
    },
  })
}

export async function lockMedicine(
  id: string,
  client: Prisma.TransactionClient,
): Promise<{ id: string; status: string; currency: string } | null> {
  const rows = await client.$queryRaw<
    Array<{ id: string; status: string; currency: string }>
  >`
    SELECT "id", "status", "currency"
    FROM "medicines"
    WHERE "id" = ${id}::uuid
    FOR UPDATE
  `
  return rows[0] ?? null
}

export async function lockBatch(
  id: string,
  client: Prisma.TransactionClient,
): Promise<{
  id: string
  medicineId: string
  status: string
  expiryDate: Date
} | null> {
  const rows = await client.$queryRaw<
    Array<{
      id: string
      medicine_id: string
      status: string
      expiry_date: Date
    }>
  >`
    SELECT "id", "medicine_id", "status", "expiry_date"
    FROM "medicine_batches"
    WHERE "id" = ${id}::uuid
    FOR UPDATE
  `
  const row = rows[0]
  if (!row) return null
  return {
    id: row.id,
    medicineId: row.medicine_id,
    status: row.status,
    expiryDate: row.expiry_date,
  }
}

export function lockActiveBatchesForMedicine(
  medicineId: string,
  client: Prisma.TransactionClient,
): Promise<
  Array<{
    id: string
    expiry_date: Date
    status: string
  }>
> {
  return client.$queryRaw`
    SELECT "id", "expiry_date", "status"
    FROM "medicine_batches"
    WHERE "medicine_id" = ${medicineId}::uuid
      AND "status" = 'active'
    ORDER BY "id" ASC
    FOR UPDATE
  `
}

export async function batchAvailableQuantity(
  medicineBatchId: string,
  client: Prisma.TransactionClient,
): Promise<Prisma.Decimal> {
  const rows = await client.$queryRaw<Array<{ available: Prisma.Decimal }>>`
    SELECT COALESCE(SUM("quantity"), 0) AS available
    FROM "stock_movements"
    WHERE "medicine_batch_id" = ${medicineBatchId}::uuid
  `
  return new Prisma.Decimal(rows[0]?.available ?? 0)
}

export async function createReceivedBatch(
  input: ReceiveStockBody,
  actorUserId: string,
  client: Prisma.TransactionClient,
) {
  const batch = await client.medicineBatch.create({
    data: {
      medicineId: input.medicineId,
      batchNumber: input.batchNumber,
      expiryDate: new Date(`${input.expiryDate}T00:00:00.000Z`),
      receivedQuantity: input.quantity,
      unitCost: input.unitCost,
      salePriceSnapshot: input.salePriceSnapshot,
      currency: input.currency,
      status: 'active',
    },
    include: batchInclude,
  })
  const movement = await client.stockMovement.create({
    data: {
      medicineBatchId: batch.id,
      movementType: 'receipt',
      quantity: input.quantity,
      performedByUserId: actorUserId,
      reason: 'Stock receipt',
    },
  })
  return { batch, movementId: movement.id }
}

export async function createAdjustmentMovement(
  input: AdjustStockBody,
  actorUserId: string,
  client: Prisma.TransactionClient,
) {
  return client.stockMovement.create({
    data: {
      medicineBatchId: input.medicineBatchId,
      movementType: 'adjustment',
      quantity: input.quantity,
      performedByUserId: actorUserId,
      reason: input.reason,
    },
    include: movementInclude,
  })
}

export async function lockPrescription(
  id: string,
  client: Prisma.TransactionClient,
): Promise<{ id: string; status: string } | null> {
  const rows = await client.$queryRaw<Array<{ id: string; status: string }>>`
    SELECT "id", "status"
    FROM "prescriptions"
    WHERE "id" = ${id}::uuid
    FOR UPDATE
  `
  return rows[0] ?? null
}

export function lockPrescriptionItems(
  prescriptionId: string,
  client: Prisma.TransactionClient,
) {
  return client.$queryRaw<
    Array<{
      id: string
      prescription_id: string
      medicine_id: string
      quantity_prescribed: Prisma.Decimal
      unit: string
    }>
  >`
    SELECT "id", "prescription_id", "medicine_id", "quantity_prescribed", "unit"
    FROM "prescription_items"
    WHERE "prescription_id" = ${prescriptionId}::uuid
    ORDER BY "id" ASC
    FOR UPDATE
  `
}

export async function effectiveDispensedQuantity(
  prescriptionItemId: string,
  client: Prisma.TransactionClient,
): Promise<Prisma.Decimal> {
  const rows = await client.$queryRaw<Array<{ effective: Prisma.Decimal }>>`
    SELECT COALESCE(SUM(d."quantity_dispensed"), 0) AS effective
    FROM "dispense_records" d
    LEFT JOIN "dispense_reversals" r ON r."dispense_record_id" = d."id"
    WHERE d."prescription_item_id" = ${prescriptionItemId}::uuid
      AND r."id" IS NULL
  `
  return new Prisma.Decimal(rows[0]?.effective ?? 0)
}

export function findDispenseForUpdate(
  dispenseId: string,
  prescriptionId: string,
  client: Prisma.TransactionClient,
) {
  return client.$queryRaw<
    Array<{
      id: string
      prescription_item_id: string
      quantity_dispensed: Prisma.Decimal
      unit: string
      status: string
      reversal_id: string | null
    }>
  >`
    SELECT
      d."id",
      d."prescription_item_id",
      d."quantity_dispensed",
      d."unit",
      d."status",
      r."id" AS reversal_id
    FROM "dispense_records" d
    INNER JOIN "prescription_items" i ON i."id" = d."prescription_item_id"
    LEFT JOIN "dispense_reversals" r ON r."dispense_record_id" = d."id"
    WHERE d."id" = ${dispenseId}::uuid
      AND i."prescription_id" = ${prescriptionId}::uuid
    FOR UPDATE OF d
  `
}

export function listDispenseMovements(
  dispenseRecordId: string,
  client: Prisma.TransactionClient,
) {
  return client.stockMovement.findMany({
    where: { dispenseRecordId, movementType: 'dispense' },
    orderBy: [{ id: 'asc' }],
  })
}

export async function createDispense(
  input: {
    prescriptionItemId: string
    quantity: DispenseItemBody['quantity']
    unit: string
    note?: string | null
    dispensedByEmployeeId: string
    allocations: Array<{ medicineBatchId: string; quantity: Prisma.Decimal }>
    actorUserId: string
    prescriptionId: string
  },
  client: Prisma.TransactionClient,
) {
  const record = await client.dispenseRecord.create({
    data: {
      prescriptionItemId: input.prescriptionItemId,
      quantityDispensed: input.quantity,
      unit: input.unit,
      dispensedByEmployeeId: input.dispensedByEmployeeId,
      status: 'completed',
      note: input.note ?? null,
    },
  })
  for (const allocation of input.allocations) {
    await client.stockMovement.create({
      data: {
        medicineBatchId: allocation.medicineBatchId,
        movementType: 'dispense',
        quantity: allocation.quantity.negated(),
        dispenseRecordId: record.id,
        performedByUserId: input.actorUserId,
        reason: 'Prescription dispense',
        referenceIdentifier: input.prescriptionId,
      },
    })
  }
  return record
}

export async function createDispenseReversal(
  input: {
    dispenseRecordId: string
    quantityReversed: Prisma.Decimal
    reason: string
    reversedByUserId: string
    originalMovements: Array<{
      medicineBatchId: string
      quantity: Prisma.Decimal
    }>
  },
  client: Prisma.TransactionClient,
) {
  const reversal = await client.dispenseReversal.create({
    data: {
      dispenseRecordId: input.dispenseRecordId,
      quantityReversed: input.quantityReversed,
      reason: input.reason,
      reversedByUserId: input.reversedByUserId,
    },
  })
  for (const movement of input.originalMovements) {
    await client.stockMovement.create({
      data: {
        medicineBatchId: movement.medicineBatchId,
        movementType: 'return',
        quantity: movement.quantity.abs(),
        dispenseReversalId: reversal.id,
        performedByUserId: input.reversedByUserId,
        reason: input.reason,
        referenceIdentifier: input.dispenseRecordId,
      },
    })
  }
  return reversal
}

export function updatePrescriptionStatus(
  id: string,
  status: string,
  client: Prisma.TransactionClient,
) {
  return client.prescription.update({
    where: { id },
    data: { status, updatedAt: new Date() },
  })
}

export function listItemEffectiveTotals(
  prescriptionId: string,
  client: Prisma.TransactionClient,
) {
  return client.$queryRaw<
    Array<{
      id: string
      quantity_prescribed: Prisma.Decimal
      effective_dispensed: Prisma.Decimal
    }>
  >`
    SELECT
      i."id",
      i."quantity_prescribed",
      COALESCE(SUM(d."quantity_dispensed") FILTER (WHERE r."id" IS NULL), 0)
        AS effective_dispensed
    FROM "prescription_items" i
    LEFT JOIN "dispense_records" d ON d."prescription_item_id" = i."id"
    LEFT JOIN "dispense_reversals" r ON r."dispense_record_id" = d."id"
    WHERE i."prescription_id" = ${prescriptionId}::uuid
    GROUP BY i."id"
    ORDER BY i."id" ASC
  `
}

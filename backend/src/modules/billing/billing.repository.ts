import { Prisma } from '@prisma/client'
import { database } from '../../database/database.service.js'
import type { ListInvoicesQuery } from './billing.schemas.js'

type BillingClient = Prisma.TransactionClient

function clientOrDefault(client?: BillingClient): BillingClient {
  return client ?? database.client
}

export const invoiceDetailInclude = {
  patient: {
    select: {
      id: true,
      patientNumber: true,
      firstName: true,
      lastName: true,
    },
  },
  createdBy: { select: { id: true, username: true } },
  items: { orderBy: [{ createdAt: 'asc' as const }, { id: 'asc' as const }] },
  payments: {
    include: { receivedBy: { select: { id: true, username: true } } },
    orderBy: [{ paidAt: 'asc' as const }, { id: 'asc' as const }],
  },
}

const invoiceListInclude = {
  patient: {
    select: {
      id: true,
      patientNumber: true,
      firstName: true,
      lastName: true,
    },
  },
} as const

const paymentInclude = {
  receivedBy: { select: { id: true, username: true } },
} as const

export type LockedPatient = {
  id: string
  patient_number: string
  first_name: string
  last_name: string
}

export type LockedAppointment = {
  id: string
  patient_id: string
  status: string
  starts_at: Date
  ends_at: Date
  doctor_first_name: string
  doctor_last_name: string
}

export type LockedLabItem = {
  id: string
  status: string
  patient_id: string
  test_code: string
  test_name: string
  catalog_price: Prisma.Decimal | null
  catalog_currency: string | null
}

export type LockedDispense = {
  id: string
  status: string
  quantity_dispensed: Prisma.Decimal
  unit: string
  patient_id: string
  medicine_code: string
  medicine_name: string
  medicine_currency: string
  reversed: boolean
}

export type DispenseAllocation = {
  quantity: Prisma.Decimal
  sale_price_snapshot: Prisma.Decimal
  currency: string
}

export type BilledSource = {
  invoice_id: string
  invoice_number: string
}

export type InvoiceTotalsInput = {
  subtotal: Prisma.Decimal
  discountAmount: Prisma.Decimal
  taxAmount: Prisma.Decimal
  totalAmount: Prisma.Decimal
  amountPaid: Prisma.Decimal
  balanceAmount: Prisma.Decimal
  status: string
}

export type InvoiceItemCreateInput = {
  category: string
  description: string
  quantity: Prisma.Decimal
  unitPrice: Prisma.Decimal
  lineTotal: Prisma.Decimal
  appointmentId?: string | null
  labRequestItemId?: string | null
  dispenseRecordId?: string | null
}

const invoiceSortColumn: Record<ListInvoicesQuery['sortBy'], string> = {
  invoiceNumber: 'invoiceNumber',
  issuedAt: 'issuedAt',
  status: 'status',
  totalAmount: 'totalAmount',
  createdAt: 'createdAt',
}

export async function lockPatient(
  id: string,
  client: BillingClient,
): Promise<LockedPatient | null> {
  const rows = await client.$queryRaw<LockedPatient[]>`
    SELECT "id", "patient_number", "first_name", "last_name"
    FROM "patients"
    WHERE "id" = ${id}::uuid
    FOR UPDATE
  `
  return rows[0] ?? null
}

export async function lockAppointment(
  id: string,
  client: BillingClient,
): Promise<LockedAppointment | null> {
  const rows = await client.$queryRaw<LockedAppointment[]>`
    SELECT
      a."id",
      a."patient_id",
      a."status",
      a."starts_at",
      a."ends_at",
      e."first_name" AS doctor_first_name,
      e."last_name" AS doctor_last_name
    FROM "appointments" a
    INNER JOIN "doctor_profiles" d ON d."id" = a."doctor_id"
    INNER JOIN "employees" e ON e."id" = d."employee_id"
    WHERE a."id" = ${id}::uuid
    FOR UPDATE OF a
  `
  return rows[0] ?? null
}

export async function lockLabRequestItem(
  id: string,
  client: BillingClient,
): Promise<LockedLabItem | null> {
  const rows = await client.$queryRaw<LockedLabItem[]>`
    SELECT
      lri."id",
      lri."status",
      lr."patient_id",
      ltd."code" AS test_code,
      ltd."name" AS test_name,
      ltd."price" AS catalog_price,
      ltd."currency" AS catalog_currency
    FROM "lab_request_items" lri
    INNER JOIN "lab_requests" lr ON lr."id" = lri."lab_request_id"
    INNER JOIN "lab_test_definitions" ltd ON ltd."id" = lri."test_definition_id"
    WHERE lri."id" = ${id}::uuid
    FOR UPDATE OF lri
  `
  return rows[0] ?? null
}

export async function lockDispenseRecord(
  id: string,
  client: BillingClient,
): Promise<LockedDispense | null> {
  const rows = await client.$queryRaw<LockedDispense[]>`
    SELECT
      dr."id",
      dr."status",
      dr."quantity_dispensed",
      dr."unit",
      p."patient_id",
      m."code" AS medicine_code,
      m."generic_name" AS medicine_name,
      m."currency" AS medicine_currency,
      EXISTS (
        SELECT 1
        FROM "dispense_reversals" rev
        WHERE rev."dispense_record_id" = dr."id"
      ) AS reversed
    FROM "dispense_records" dr
    INNER JOIN "prescription_items" pi ON pi."id" = dr."prescription_item_id"
    INNER JOIN "prescriptions" p ON p."id" = pi."prescription_id"
    INNER JOIN "medicines" m ON m."id" = pi."medicine_id"
    WHERE dr."id" = ${id}::uuid
    FOR UPDATE OF dr
  `
  return rows[0] ?? null
}

export function listDispenseAllocations(
  dispenseRecordId: string,
  client: BillingClient,
) {
  return client.$queryRaw<DispenseAllocation[]>`
    SELECT
      sm."quantity",
      mb."sale_price_snapshot",
      mb."currency"
    FROM "stock_movements" sm
    INNER JOIN "medicine_batches" mb ON mb."id" = sm."medicine_batch_id"
    WHERE sm."dispense_record_id" = ${dispenseRecordId}::uuid
      AND sm."movement_type" = 'dispense'
    ORDER BY sm."id" ASC
  `
}

export async function findBilledLabItem(
  labRequestItemId: string,
  client: BillingClient,
  excludeInvoiceId?: string,
): Promise<BilledSource | null> {
  const rows = excludeInvoiceId
    ? await client.$queryRaw<BilledSource[]>`
        SELECT i."id" AS invoice_id, i."invoice_number"
        FROM "invoice_items" ii
        INNER JOIN "invoices" i ON i."id" = ii."invoice_id"
        WHERE ii."lab_request_item_id" = ${labRequestItemId}::uuid
          AND i."status" <> 'void'
          AND i."id" <> ${excludeInvoiceId}::uuid
        LIMIT 1
      `
    : await client.$queryRaw<BilledSource[]>`
        SELECT i."id" AS invoice_id, i."invoice_number"
        FROM "invoice_items" ii
        INNER JOIN "invoices" i ON i."id" = ii."invoice_id"
        WHERE ii."lab_request_item_id" = ${labRequestItemId}::uuid
          AND i."status" <> 'void'
        LIMIT 1
      `
  return rows[0] ?? null
}

export async function findBilledDispense(
  dispenseRecordId: string,
  client: BillingClient,
  excludeInvoiceId?: string,
): Promise<BilledSource | null> {
  const rows = excludeInvoiceId
    ? await client.$queryRaw<BilledSource[]>`
        SELECT i."id" AS invoice_id, i."invoice_number"
        FROM "invoice_items" ii
        INNER JOIN "invoices" i ON i."id" = ii."invoice_id"
        WHERE ii."dispense_record_id" = ${dispenseRecordId}::uuid
          AND i."status" <> 'void'
          AND i."id" <> ${excludeInvoiceId}::uuid
        LIMIT 1
      `
    : await client.$queryRaw<BilledSource[]>`
        SELECT i."id" AS invoice_id, i."invoice_number"
        FROM "invoice_items" ii
        INNER JOIN "invoices" i ON i."id" = ii."invoice_id"
        WHERE ii."dispense_record_id" = ${dispenseRecordId}::uuid
          AND i."status" <> 'void'
        LIMIT 1
      `
  return rows[0] ?? null
}

export async function lockInvoice(
  id: string,
  client: BillingClient,
) {
  const rows = await client.$queryRaw<Array<{ id: string; status: string }>>`
    SELECT "id", "status"
    FROM "invoices"
    WHERE "id" = ${id}::uuid
    FOR UPDATE
  `
  return rows[0] ?? null
}

export function findInvoiceById(id: string, client?: BillingClient) {
  return clientOrDefault(client).invoice.findUnique({
    where: { id },
    include: invoiceDetailInclude,
  })
}

export function findPaymentById(id: string, client?: BillingClient) {
  return clientOrDefault(client).payment.findUnique({
    where: { id },
    include: {
      ...paymentInclude,
      invoice: true,
    },
  })
}

export async function listInvoices(query: ListInvoicesQuery) {
  const where: Prisma.InvoiceWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.patientId ? { patientId: query.patientId } : {}),
    ...(query.search
      ? {
          OR: [
            { invoiceNumber: { contains: query.search, mode: 'insensitive' } },
            {
              patient: {
                patientNumber: { contains: query.search, mode: 'insensitive' },
              },
            },
            {
              patient: {
                firstName: { contains: query.search, mode: 'insensitive' },
              },
            },
            {
              patient: {
                lastName: { contains: query.search, mode: 'insensitive' },
              },
            },
          ],
        }
      : {}),
  }
  const totalItems = await database.client.invoice.count({ where })
  const offset = (query.page - 1) * query.pageSize
  const invoices =
    offset >= totalItems
      ? []
      : await database.client.invoice.findMany({
          where,
          skip: offset,
          take: query.pageSize,
          include: invoiceListInclude,
          orderBy: [
            { [invoiceSortColumn[query.sortBy]]: query.sortOrder },
            { id: 'asc' },
          ],
        })
  return { invoices, totalItems }
}

export async function listBillingPatients(query: {
  page: number
  pageSize: number
  search?: string | undefined
}) {
  const where: Prisma.PatientWhereInput = query.search
    ? {
        OR: [
          { patientNumber: { contains: query.search, mode: 'insensitive' } },
          { firstName: { contains: query.search, mode: 'insensitive' } },
          { lastName: { contains: query.search, mode: 'insensitive' } },
        ],
      }
    : {}
  const totalItems = await database.client.patient.count({ where })
  const offset = (query.page - 1) * query.pageSize
  const patients =
    offset >= totalItems
      ? []
      : await database.client.patient.findMany({
          where,
          skip: offset,
          take: query.pageSize,
          select: {
            id: true,
            patientNumber: true,
            firstName: true,
            lastName: true,
          },
          orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }, { id: 'asc' }],
        })
  return { patients, totalItems }
}

export function listConsultationSources(patientId: string) {
  return database.client.$queryRaw<
    Array<{
      appointment_id: string
      starts_at: Date
      ends_at: Date
      doctor_first_name: string
      doctor_last_name: string
      billed_invoice_id: string | null
      billed_invoice_number: string | null
    }>
  >`
    SELECT
      a."id" AS appointment_id,
      a."starts_at",
      a."ends_at",
      e."first_name" AS doctor_first_name,
      e."last_name" AS doctor_last_name,
      billed."id" AS billed_invoice_id,
      billed."invoice_number" AS billed_invoice_number
    FROM "appointments" a
    INNER JOIN "doctor_profiles" d ON d."id" = a."doctor_id"
    INNER JOIN "employees" e ON e."id" = d."employee_id"
    LEFT JOIN LATERAL (
      SELECT i."id", i."invoice_number"
      FROM "invoice_items" ii
      INNER JOIN "invoices" i ON i."id" = ii."invoice_id"
      WHERE ii."appointment_id" = a."id"
        AND i."status" <> 'void'
      ORDER BY i."created_at" DESC
      LIMIT 1
    ) billed ON TRUE
    WHERE a."patient_id" = ${patientId}::uuid
      AND a."status" = 'completed'
    ORDER BY a."starts_at" DESC, a."id" ASC
  `
}

export function listLaboratorySources(patientId: string) {
  return database.client.$queryRaw<
    Array<{
      lab_request_item_id: string
      test_code: string
      test_name: string
      catalog_price: Prisma.Decimal
      catalog_currency: string | null
      billed_invoice_id: string | null
      billed_invoice_number: string | null
    }>
  >`
    SELECT
      lri."id" AS lab_request_item_id,
      ltd."code" AS test_code,
      ltd."name" AS test_name,
      ltd."price" AS catalog_price,
      ltd."currency" AS catalog_currency,
      billed."id" AS billed_invoice_id,
      billed."invoice_number" AS billed_invoice_number
    FROM "lab_request_items" lri
    INNER JOIN "lab_requests" lr ON lr."id" = lri."lab_request_id"
    INNER JOIN "lab_test_definitions" ltd ON ltd."id" = lri."test_definition_id"
    LEFT JOIN LATERAL (
      SELECT i."id", i."invoice_number"
      FROM "invoice_items" ii
      INNER JOIN "invoices" i ON i."id" = ii."invoice_id"
      WHERE ii."lab_request_item_id" = lri."id"
        AND i."status" <> 'void'
      LIMIT 1
    ) billed ON TRUE
    WHERE lr."patient_id" = ${patientId}::uuid
      AND lri."status" = 'completed'
      AND ltd."price" IS NOT NULL
    ORDER BY lri."created_at" DESC, lri."id" ASC
  `
}

export function listPharmacySources(patientId: string) {
  return database.client.$queryRaw<
    Array<{
      dispense_record_id: string
      medicine_code: string
      medicine_name: string
      quantity_dispensed: Prisma.Decimal
      unit: string
      billed_invoice_id: string | null
      billed_invoice_number: string | null
    }>
  >`
    SELECT
      dr."id" AS dispense_record_id,
      m."code" AS medicine_code,
      m."generic_name" AS medicine_name,
      dr."quantity_dispensed",
      dr."unit",
      billed."id" AS billed_invoice_id,
      billed."invoice_number" AS billed_invoice_number
    FROM "dispense_records" dr
    INNER JOIN "prescription_items" pi ON pi."id" = dr."prescription_item_id"
    INNER JOIN "prescriptions" p ON p."id" = pi."prescription_id"
    INNER JOIN "medicines" m ON m."id" = pi."medicine_id"
    LEFT JOIN LATERAL (
      SELECT i."id", i."invoice_number"
      FROM "invoice_items" ii
      INNER JOIN "invoices" i ON i."id" = ii."invoice_id"
      WHERE ii."dispense_record_id" = dr."id"
        AND i."status" <> 'void'
      LIMIT 1
    ) billed ON TRUE
    WHERE p."patient_id" = ${patientId}::uuid
      AND dr."status" = 'completed'
      AND NOT EXISTS (
        SELECT 1
        FROM "dispense_reversals" rev
        WHERE rev."dispense_record_id" = dr."id"
      )
    ORDER BY dr."dispensed_at" DESC, dr."id" ASC
  `
}

export function createInvoiceRecord(
  data: {
    invoiceNumber: string
    patientId: string
    currency: string
    createdByUserId: string
    totals: InvoiceTotalsInput
    items: InvoiceItemCreateInput[]
  },
  client: BillingClient,
) {
  return client.invoice.create({
    data: {
      invoiceNumber: data.invoiceNumber,
      patientId: data.patientId,
      currency: data.currency,
      createdByUserId: data.createdByUserId,
      subtotal: data.totals.subtotal,
      discountAmount: data.totals.discountAmount,
      taxAmount: data.totals.taxAmount,
      totalAmount: data.totals.totalAmount,
      amountPaid: data.totals.amountPaid,
      balanceAmount: data.totals.balanceAmount,
      status: data.totals.status,
      items: {
        create: data.items.map((item) => ({
          category: item.category,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
          appointmentId: item.appointmentId ?? null,
          labRequestItemId: item.labRequestItemId ?? null,
          dispenseRecordId: item.dispenseRecordId ?? null,
        })),
      },
    },
    include: invoiceDetailInclude,
  })
}

export async function replaceInvoiceItems(
  invoiceId: string,
  items: InvoiceItemCreateInput[],
  totals: InvoiceTotalsInput,
  client: BillingClient,
) {
  await client.invoiceItem.deleteMany({ where: { invoiceId } })
  await client.invoice.update({
    where: { id: invoiceId },
    data: {
      subtotal: totals.subtotal,
      discountAmount: totals.discountAmount,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      amountPaid: totals.amountPaid,
      balanceAmount: totals.balanceAmount,
      status: totals.status,
      updatedAt: new Date(),
      items: {
        create: items.map((item) => ({
          category: item.category,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
          appointmentId: item.appointmentId ?? null,
          labRequestItemId: item.labRequestItemId ?? null,
          dispenseRecordId: item.dispenseRecordId ?? null,
        })),
      },
    },
  })
  return client.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: invoiceDetailInclude,
  })
}

export function updateInvoiceFinancialState(
  invoiceId: string,
  data: InvoiceTotalsInput & { issuedAt?: Date },
  client: BillingClient,
) {
  return client.invoice.update({
    where: { id: invoiceId },
    data: {
      subtotal: data.subtotal,
      discountAmount: data.discountAmount,
      taxAmount: data.taxAmount,
      totalAmount: data.totalAmount,
      amountPaid: data.amountPaid,
      balanceAmount: data.balanceAmount,
      status: data.status,
      ...(data.issuedAt ? { issuedAt: data.issuedAt } : {}),
      updatedAt: new Date(),
    },
    include: invoiceDetailInclude,
  })
}

export function createPaymentRecord(
  data: {
    paymentNumber: string
    invoiceId: string
    amount: Prisma.Decimal
    currency: string
    method: string
    externalReference: string | null
    receivedByUserId: string
    note?: string | null
    reversesPaymentId?: string | null
    status: string
  },
  client: BillingClient,
) {
  return client.payment.create({
    data: {
      paymentNumber: data.paymentNumber,
      invoiceId: data.invoiceId,
      amount: data.amount,
      currency: data.currency,
      method: data.method,
      externalReference: data.externalReference,
      receivedByUserId: data.receivedByUserId,
      note: data.note ?? null,
      reversesPaymentId: data.reversesPaymentId ?? null,
      status: data.status,
    },
    include: paymentInclude,
  })
}

export function markPaymentReversed(
  paymentId: string,
  client: BillingClient,
) {
  return client.payment.update({
    where: { id: paymentId },
    data: {
      status: 'reversed',
      updatedAt: new Date(),
    },
  })
}

export async function effectivePaidAmount(
  invoiceId: string,
  client: BillingClient,
): Promise<Prisma.Decimal> {
  const rows = await client.$queryRaw<Array<{ total: Prisma.Decimal | null }>>`
    SELECT COALESCE(SUM("amount"), 0) AS total
    FROM "payments"
    WHERE "invoice_id" = ${invoiceId}::uuid
      AND "status" = 'recorded'
      AND "reverses_payment_id" IS NULL
  `
  return new Prisma.Decimal(rows[0]?.total ?? 0)
}

export function listInvoicePayments(invoiceId: string) {
  return database.client.payment.findMany({
    where: { invoiceId },
    include: paymentInclude,
    orderBy: [{ paidAt: 'asc' }, { id: 'asc' }],
  })
}

export function patientExists(id: string) {
  return database.client.patient.findUnique({
    where: { id },
    select: { id: true },
  })
}

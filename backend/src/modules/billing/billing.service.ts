import { randomUUID } from 'node:crypto'
import { Prisma } from '@prisma/client'
import { env } from '../../config/env.js'
import { database } from '../../database/database.service.js'
import { isUniqueConstraint } from '../../database/prismaErrors.js'
import {
  ConflictError,
  NotFoundError,
} from '../../errors/httpErrors.js'
import { writeAudit } from '../audit/audit.service.js'
import {
  deriveIssuedStatus,
  invoiceTotals,
  isDraft,
  isPayable,
  isVoid,
  lineTotal,
  roundMoney,
  toDecimal,
  weightedAverageUnitPrice,
  ZERO,
} from './billing.lifecycle.js'
import {
  createInvoiceRecord,
  createPaymentRecord,
  effectivePaidAmount,
  findBilledDispense,
  findBilledLabItem,
  findInvoiceById,
  findPaymentById,
  listBillingPatients,
  listConsultationSources,
  listDispenseAllocations,
  listInvoicePayments,
  listInvoices,
  listLaboratorySources,
  listPharmacySources,
  lockAppointment,
  lockDispenseRecord,
  lockInvoice,
  lockLabRequestItem,
  lockPatient,
  markPaymentReversed,
  patientExists,
  replaceInvoiceItems,
  updateInvoiceFinancialState,
  type InvoiceItemCreateInput,
} from './billing.repository.js'
import type {
  CreateInvoiceBody,
  CreatePaymentBody,
  InvoiceItemInput,
  ListBillingPatientsQuery,
  ListInvoicesQuery,
  ReversePaymentBody,
  UpdateInvoiceBody,
  VoidInvoiceBody,
} from './billing.schemas.js'
import {
  toBillingPatientDto,
  toInvoiceDetailDto,
  toInvoiceListItemDto,
  toPaymentDto,
  type BillingPatientDto,
  type ConsultationSourceDto,
  type InvoiceDetailDto,
  type InvoiceListItemDto,
  type LaboratorySourceDto,
  type PaymentDto,
  type PharmacySourceDto,
} from './billing.types.js'

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

type SourceLock =
  | { kind: 'appointment'; id: string }
  | { kind: 'lab'; id: string }
  | { kind: 'dispense'; id: string }

function isDbTrue(value: unknown): boolean {
  return value === true || value === 't' || value === 'true'
}

function paginationFor(
  page: number,
  pageSize: number,
  totalItems: number,
): Pagination {
  return {
    page,
    pageSize,
    totalItems,
    totalPages: Math.ceil(totalItems / pageSize) || 0,
  }
}

function defaultCurrency(): string {
  return env.hospital.defaultCurrency
}

function invoiceNumber(): string {
  return `INV-${randomUUID()}`
}

function paymentNumber(): string {
  return `PAY-${randomUUID()}`
}

function sourceLocksFromItems(items: readonly InvoiceItemInput[]): SourceLock[] {
  const locks = new Map<string, SourceLock>()
  for (const item of items) {
    if (item.category === 'consultation') {
      locks.set(`appointment:${item.appointmentId}`, {
        kind: 'appointment',
        id: item.appointmentId,
      })
    } else if (item.category === 'laboratory') {
      locks.set(`lab:${item.labRequestItemId}`, {
        kind: 'lab',
        id: item.labRequestItemId,
      })
    } else {
      locks.set(`dispense:${item.dispenseRecordId}`, {
        kind: 'dispense',
        id: item.dispenseRecordId,
      })
    }
  }
  return [...locks.values()].sort((left, right) => {
    if (left.kind !== right.kind) return left.kind.localeCompare(right.kind)
    return left.id.localeCompare(right.id)
  })
}

function duplicateSourceConflict(kind: 'laboratory' | 'pharmacy', invoiceNumberValue: string) {
  return new ConflictError(
    kind === 'laboratory'
      ? `This laboratory item is already billed on invoice ${invoiceNumberValue}.`
      : `This pharmacy dispense is already billed on invoice ${invoiceNumberValue}.`,
  )
}

function assertSamePatient(
  sourcePatientId: string,
  invoicePatientId: string,
  sourceLabel: string,
): void {
  if (sourcePatientId !== invoicePatientId) {
    throw new ConflictError(
      `${sourceLabel} does not belong to the invoice patient.`,
    )
  }
}

async function lockBillableSources(
  items: readonly InvoiceItemInput[],
  client: Prisma.TransactionClient,
): Promise<void> {
  for (const lock of sourceLocksFromItems(items)) {
    if (lock.kind === 'appointment') {
      const appointment = await lockAppointment(lock.id, client)
      if (!appointment) {
        throw new NotFoundError('Appointment was not found.')
      }
    } else if (lock.kind === 'lab') {
      const item = await lockLabRequestItem(lock.id, client)
      if (!item) {
        throw new NotFoundError('Laboratory request item was not found.')
      }
    } else {
      const dispense = await lockDispenseRecord(lock.id, client)
      if (!dispense) {
        throw new NotFoundError('Pharmacy dispense was not found.')
      }
    }
  }
}

function assertUniqueLabAndPharmacy(items: readonly InvoiceItemInput[]): void {
  const labIds = new Set<string>()
  const dispenseIds = new Set<string>()
  for (const item of items) {
    if (item.category === 'laboratory') {
      if (labIds.has(item.labRequestItemId)) {
        throw new ConflictError(
          'The same laboratory item cannot appear twice on one invoice.',
        )
      }
      labIds.add(item.labRequestItemId)
    }
    if (item.category === 'pharmacy') {
      if (dispenseIds.has(item.dispenseRecordId)) {
        throw new ConflictError(
          'The same pharmacy dispense cannot appear twice on one invoice.',
        )
      }
      dispenseIds.add(item.dispenseRecordId)
    }
  }
}

async function resolveConsultationItem(
  item: Extract<InvoiceItemInput, { category: 'consultation' }>,
  patientId: string,
  client: Prisma.TransactionClient,
): Promise<InvoiceItemCreateInput> {
  const appointment = await lockAppointment(item.appointmentId, client)
  if (!appointment) {
    throw new NotFoundError('Appointment was not found.')
  }
  assertSamePatient(appointment.patient_id, patientId, 'Appointment')
  if (appointment.status !== 'completed') {
    throw new ConflictError('Only completed appointments can be billed.')
  }
  const unitPrice = roundMoney(item.unitPrice)
  const quantity = new Prisma.Decimal(1)
  const doctorName = `${appointment.doctor_first_name} ${appointment.doctor_last_name}`.trim()
  return {
    category: 'consultation',
    description: `Consultation with ${doctorName}`.slice(0, 500),
    quantity,
    unitPrice,
    lineTotal: lineTotal(quantity, unitPrice),
    appointmentId: appointment.id,
  }
}

async function resolveLaboratoryItem(
  item: Extract<InvoiceItemInput, { category: 'laboratory' }>,
  patientId: string,
  currency: string,
  client: Prisma.TransactionClient,
  excludeInvoiceId?: string,
): Promise<InvoiceItemCreateInput> {
  const labItem = await lockLabRequestItem(item.labRequestItemId, client)
  if (!labItem) {
    throw new NotFoundError('Laboratory request item was not found.')
  }
  assertSamePatient(labItem.patient_id, patientId, 'Laboratory request item')
  if (labItem.status !== 'completed') {
    throw new ConflictError('Only completed laboratory request items can be billed.')
  }
  if (labItem.catalog_price == null) {
    throw new ConflictError('This laboratory test has no billable catalog price.')
  }
  if (labItem.catalog_currency && labItem.catalog_currency !== currency) {
    throw new ConflictError(
      'Laboratory catalog currency does not match the hospital currency.',
    )
  }
  const billed = await findBilledLabItem(labItem.id, client, excludeInvoiceId)
  if (billed) {
    throw duplicateSourceConflict('laboratory', billed.invoice_number)
  }
  const unitPrice = roundMoney(labItem.catalog_price)
  const quantity = new Prisma.Decimal(1)
  return {
    category: 'laboratory',
    description: `${labItem.test_code} ${labItem.test_name}`.trim().slice(0, 500),
    quantity,
    unitPrice,
    lineTotal: lineTotal(quantity, unitPrice),
    labRequestItemId: labItem.id,
  }
}

async function resolvePharmacyItem(
  item: Extract<InvoiceItemInput, { category: 'pharmacy' }>,
  patientId: string,
  currency: string,
  client: Prisma.TransactionClient,
  excludeInvoiceId?: string,
): Promise<InvoiceItemCreateInput> {
  const dispense = await lockDispenseRecord(item.dispenseRecordId, client)
  if (!dispense) {
    throw new NotFoundError('Pharmacy dispense was not found.')
  }
  assertSamePatient(dispense.patient_id, patientId, 'Pharmacy dispense')
  if (dispense.status !== 'completed' || isDbTrue(dispense.reversed)) {
    throw new ConflictError('Only unreversed completed dispenses can be billed.')
  }
  if (dispense.medicine_currency !== currency) {
    throw new ConflictError(
      'Pharmacy currency does not match the hospital currency.',
    )
  }
  const billed = await findBilledDispense(dispense.id, client, excludeInvoiceId)
  if (billed) {
    throw duplicateSourceConflict('pharmacy', billed.invoice_number)
  }
  const allocations = await listDispenseAllocations(dispense.id, client)
  if (allocations.length === 0) {
    throw new ConflictError('This dispense has no stock movements to price.')
  }
  if (allocations.some((allocation) => allocation.currency !== currency)) {
    throw new ConflictError(
      'Pharmacy batch currency does not match the hospital currency.',
    )
  }
  const unitPrice = weightedAverageUnitPrice(
    allocations.map((allocation) => ({
      quantity: allocation.quantity,
      unitPrice: allocation.sale_price_snapshot,
    })),
  )
  const quantity = toDecimal(dispense.quantity_dispensed)
  return {
    category: 'pharmacy',
    description: `${dispense.medicine_code} ${dispense.medicine_name}`.trim().slice(0, 500),
    quantity,
    unitPrice,
    lineTotal: lineTotal(quantity, unitPrice),
    dispenseRecordId: dispense.id,
  }
}

async function resolveInvoiceItems(
  patientId: string,
  items: readonly InvoiceItemInput[],
  client: Prisma.TransactionClient,
  excludeInvoiceId?: string,
): Promise<InvoiceItemCreateInput[]> {
  assertUniqueLabAndPharmacy(items)
  const currency = defaultCurrency()
  await lockBillableSources(items, client)
  const resolved: InvoiceItemCreateInput[] = []
  for (const item of items) {
    if (item.category === 'consultation') {
      resolved.push(
        await resolveConsultationItem(item, patientId, client),
      )
    } else if (item.category === 'laboratory') {
      resolved.push(
        await resolveLaboratoryItem(
          item,
          patientId,
          currency,
          client,
          excludeInvoiceId,
        ),
      )
    } else {
      resolved.push(
        await resolvePharmacyItem(
          item,
          patientId,
          currency,
          client,
          excludeInvoiceId,
        ),
      )
    }
  }
  return resolved
}

function totalsFromItems(
  items: readonly InvoiceItemCreateInput[],
  status: string,
  amountPaid = ZERO,
) {
  const totals = invoiceTotals(items.map((item) => item.lineTotal))
  const paid = roundMoney(amountPaid)
  if (paid.gt(totals.totalAmount)) {
    throw new ConflictError('Effective payments cannot exceed the invoice total.')
  }
  return {
    ...totals,
    amountPaid: paid,
    balanceAmount: roundMoney(totals.totalAmount.minus(paid)),
    status,
  }
}

async function requireInvoiceDetail(id: string): Promise<InvoiceDetailDto> {
  const invoice = await findInvoiceById(id)
  if (!invoice) {
    throw new NotFoundError('Invoice was not found.')
  }
  return toInvoiceDetailDto(invoice)
}

function mapBillingWriteError(error: unknown): never {
  if (isUniqueConstraint(error, ['invoice_number', 'uq_invoices_invoice_number'])) {
    throw new ConflictError('Invoice number could not be allocated.')
  }
  if (isUniqueConstraint(error, ['payment_number', 'uq_payments_payment_number'])) {
    throw new ConflictError('Payment number could not be allocated.')
  }
  if (
    isUniqueConstraint(error, [
      'reverses_payment_id',
      'uq_payments_reverses_payment_id',
    ])
  ) {
    throw new ConflictError('This payment has already been reversed.')
  }
  throw error
}

export async function getInvoices(query: ListInvoicesQuery): Promise<{
  data: InvoiceListItemDto[]
  pagination: Pagination
}> {
  const result = await listInvoices(query)
  return {
    data: result.invoices.map(toInvoiceListItemDto),
    pagination: paginationFor(query.page, query.pageSize, result.totalItems),
  }
}

export function getInvoice(id: string): Promise<InvoiceDetailDto> {
  return requireInvoiceDetail(id)
}

export async function getBillingPatients(query: ListBillingPatientsQuery): Promise<{
  data: BillingPatientDto[]
  pagination: Pagination
}> {
  const result = await listBillingPatients(query)
  return {
    data: result.patients.map(toBillingPatientDto),
    pagination: paginationFor(query.page, query.pageSize, result.totalItems),
  }
}

export async function getConsultationSources(
  patientId: string,
): Promise<ConsultationSourceDto[]> {
  if (!(await patientExists(patientId))) {
    throw new NotFoundError('Patient was not found.')
  }
  const rows = await listConsultationSources(patientId)
  return rows.map((row) => ({
    appointmentId: row.appointment_id,
    startsAt: row.starts_at.toISOString(),
    endsAt: row.ends_at.toISOString(),
    doctorDisplayName: `${row.doctor_first_name} ${row.doctor_last_name}`.trim(),
    billed: row.billed_invoice_id != null,
    billedInvoiceId: row.billed_invoice_id,
    billedInvoiceNumber: row.billed_invoice_number,
  }))
}

export async function getLaboratorySources(
  patientId: string,
): Promise<LaboratorySourceDto[]> {
  if (!(await patientExists(patientId))) {
    throw new NotFoundError('Patient was not found.')
  }
  const currency = defaultCurrency()
  const rows = await listLaboratorySources(patientId)
  return rows
    .filter(
      (row) => !row.catalog_currency || row.catalog_currency === currency,
    )
    .map((row) => ({
      labRequestItemId: row.lab_request_item_id,
      testCode: row.test_code,
      testName: row.test_name,
      quantity: '1',
      unitPrice: toDecimal(row.catalog_price).toString(),
      currency: row.catalog_currency ?? currency,
      billed: row.billed_invoice_id != null,
      billedInvoiceId: row.billed_invoice_id,
      billedInvoiceNumber: row.billed_invoice_number,
    }))
}

export async function getPharmacySources(
  patientId: string,
): Promise<PharmacySourceDto[]> {
  if (!(await patientExists(patientId))) {
    throw new NotFoundError('Patient was not found.')
  }
  const currency = defaultCurrency()
  const rows = await listPharmacySources(patientId)
  const sources: PharmacySourceDto[] = []
  for (const row of rows) {
    const allocations = await listDispenseAllocations(
      row.dispense_record_id,
      database.client,
    )
    if (allocations.length === 0) continue
    if (allocations.some((allocation) => allocation.currency !== currency)) {
      continue
    }
    sources.push({
      dispenseRecordId: row.dispense_record_id,
      medicineCode: row.medicine_code,
      medicineName: row.medicine_name,
      quantity: toDecimal(row.quantity_dispensed).toString(),
      unit: row.unit,
      unitPrice: weightedAverageUnitPrice(
        allocations.map((allocation) => ({
          quantity: allocation.quantity,
          unitPrice: allocation.sale_price_snapshot,
        })),
      ).toString(),
      currency,
      billed: row.billed_invoice_id != null,
      billedInvoiceId: row.billed_invoice_id,
      billedInvoiceNumber: row.billed_invoice_number,
    })
  }
  return sources
}

export async function createDraftInvoice(
  input: CreateInvoiceBody,
  context: MutationContext,
): Promise<InvoiceDetailDto> {
  try {
    const invoice = await database.client.$transaction(async (transaction) => {
      const patient = await lockPatient(input.patientId, transaction)
      if (!patient) {
        throw new NotFoundError('Patient was not found.')
      }
      const items = await resolveInvoiceItems(
        input.patientId,
        input.items,
        transaction,
      )
      const created = await createInvoiceRecord(
        {
          invoiceNumber: invoiceNumber(),
          patientId: input.patientId,
          currency: defaultCurrency(),
          createdByUserId: context.actorUserId,
          totals: totalsFromItems(items, 'draft'),
          items,
        },
        transaction,
      )
      await writeAudit(
        {
          actorUserId: context.actorUserId,
          action: 'invoice.create',
          resourceType: 'invoice',
          resourceId: created.id,
          outcome: 'success',
          requestId: context.requestId,
          metadata: {
            invoiceNumber: created.invoiceNumber,
            patientId: created.patientId,
            itemCount: created.items.length,
            totalAmount: created.totalAmount.toString(),
            currency: created.currency,
            status: created.status,
          },
        },
        transaction,
      )
      return created
    })
    return toInvoiceDetailDto(invoice)
  } catch (error) {
    mapBillingWriteError(error)
  }
}

export async function updateDraftInvoice(
  id: string,
  input: UpdateInvoiceBody,
  context: MutationContext,
): Promise<InvoiceDetailDto> {
  try {
    const invoice = await database.client.$transaction(async (transaction) => {
      const locked = await lockInvoice(id, transaction)
      if (!locked) {
        throw new NotFoundError('Invoice was not found.')
      }
      const current = await findInvoiceById(id, transaction)
      if (!current) {
        throw new NotFoundError('Invoice was not found.')
      }
      if (isVoid(current.status)) {
        throw new ConflictError('A void invoice cannot be edited.')
      }
      if (!isDraft(current.status)) {
        throw new ConflictError('Only draft invoices can be edited.')
      }
      const items = await resolveInvoiceItems(
        current.patientId,
        input.items,
        transaction,
        current.id,
      )
      const updated = await replaceInvoiceItems(
        current.id,
        items,
        totalsFromItems(items, 'draft'),
        transaction,
      )
      await writeAudit(
        {
          actorUserId: context.actorUserId,
          action: 'invoice.update',
          resourceType: 'invoice',
          resourceId: updated.id,
          outcome: 'success',
          requestId: context.requestId,
          metadata: {
            invoiceNumber: updated.invoiceNumber,
            patientId: updated.patientId,
            itemCount: updated.items.length,
            totalAmount: updated.totalAmount.toString(),
            currency: updated.currency,
          },
        },
        transaction,
      )
      return updated
    })
    return toInvoiceDetailDto(invoice)
  } catch (error) {
    mapBillingWriteError(error)
  }
}

export async function issueInvoice(
  id: string,
  context: MutationContext,
): Promise<InvoiceDetailDto> {
  const invoice = await database.client.$transaction(async (transaction) => {
    const locked = await lockInvoice(id, transaction)
    if (!locked) {
      throw new NotFoundError('Invoice was not found.')
    }
    const current = await findInvoiceById(id, transaction)
    if (!current) {
      throw new NotFoundError('Invoice was not found.')
    }
    if (isVoid(current.status)) {
      throw new ConflictError('A void invoice cannot be issued.')
    }
    if (!isDraft(current.status)) {
      throw new ConflictError('Only draft invoices can be issued.')
    }
    if (current.items.length === 0) {
      throw new ConflictError('An invoice must have at least one item to be issued.')
    }
    const sourceItems: InvoiceItemInput[] = current.items.map((item) => {
      if (item.category === 'consultation' && item.appointmentId) {
        return {
          category: 'consultation',
          appointmentId: item.appointmentId,
          unitPrice: item.unitPrice.toString(),
        }
      }
      if (item.category === 'laboratory' && item.labRequestItemId) {
        return {
          category: 'laboratory',
          labRequestItemId: item.labRequestItemId,
        }
      }
      if (item.category === 'pharmacy' && item.dispenseRecordId) {
        return {
          category: 'pharmacy',
          dispenseRecordId: item.dispenseRecordId,
        }
      }
      throw new ConflictError('Invoice contains an unsupported billable source.')
    })
    const items = await resolveInvoiceItems(
      current.patientId,
      sourceItems,
      transaction,
      current.id,
    )
    const paid = await effectivePaidAmount(current.id, transaction)
    const totals = totalsFromItems(
      items,
      deriveIssuedStatus(invoiceTotals(items.map((item) => item.lineTotal)).totalAmount, paid),
      paid,
    )
    await replaceInvoiceItems(current.id, items, totals, transaction)
    const issued = await updateInvoiceFinancialState(
      current.id,
      { ...totals, issuedAt: new Date() },
      transaction,
    )
    await writeAudit(
      {
        actorUserId: context.actorUserId,
        action: 'invoice.issue',
        resourceType: 'invoice',
        resourceId: issued.id,
        outcome: 'success',
        requestId: context.requestId,
        metadata: {
          invoiceNumber: issued.invoiceNumber,
          patientId: issued.patientId,
          totalAmount: issued.totalAmount.toString(),
          currency: issued.currency,
          status: issued.status,
        },
      },
      transaction,
    )
    return issued
  })
  return toInvoiceDetailDto(invoice)
}

export async function voidInvoice(
  id: string,
  input: VoidInvoiceBody,
  context: MutationContext,
): Promise<InvoiceDetailDto> {
  const invoice = await database.client.$transaction(async (transaction) => {
    const locked = await lockInvoice(id, transaction)
    if (!locked) {
      throw new NotFoundError('Invoice was not found.')
    }
    const current = await findInvoiceById(id, transaction)
    if (!current) {
      throw new NotFoundError('Invoice was not found.')
    }
    if (isVoid(current.status)) {
      throw new ConflictError('This invoice is already void.')
    }
    const paid = await effectivePaidAmount(current.id, transaction)
    if (paid.gt(0)) {
      throw new ConflictError(
        'Reverse every recorded payment before voiding a partially paid or paid invoice.',
      )
    }
    const voided = await updateInvoiceFinancialState(
      current.id,
      {
        subtotal: current.subtotal,
        discountAmount: ZERO,
        taxAmount: ZERO,
        totalAmount: current.totalAmount,
        amountPaid: ZERO,
        balanceAmount: current.totalAmount,
        status: 'void',
      },
      transaction,
    )
    await writeAudit(
      {
        actorUserId: context.actorUserId,
        action: 'invoice.void',
        resourceType: 'invoice',
        resourceId: voided.id,
        outcome: 'success',
        requestId: context.requestId,
        metadata: {
          invoiceNumber: voided.invoiceNumber,
          patientId: voided.patientId,
          previousStatus: current.status,
          reason: input.reason,
        },
      },
      transaction,
    )
    return voided
  })
  return toInvoiceDetailDto(invoice)
}

export async function getInvoicePayments(invoiceId: string): Promise<PaymentDto[]> {
  const invoice = await findInvoiceById(invoiceId)
  if (!invoice) {
    throw new NotFoundError('Invoice was not found.')
  }
  const payments = await listInvoicePayments(invoiceId)
  return payments.map(toPaymentDto)
}

export async function createInvoicePayment(
  invoiceId: string,
  input: CreatePaymentBody,
  context: MutationContext,
): Promise<PaymentDto> {
  try {
    const payment = await database.client.$transaction(async (transaction) => {
      const locked = await lockInvoice(invoiceId, transaction)
      if (!locked) {
        throw new NotFoundError('Invoice was not found.')
      }
      const invoice = await findInvoiceById(invoiceId, transaction)
      if (!invoice) {
        throw new NotFoundError('Invoice was not found.')
      }
      if (isVoid(invoice.status)) {
        throw new ConflictError('A void invoice cannot receive payments.')
      }
      if (isDraft(invoice.status) || !isPayable(invoice.status)) {
        throw new ConflictError('Payments can be recorded only after an invoice is issued.')
      }
      const amount = roundMoney(input.amount)
      const paid = await effectivePaidAmount(invoice.id, transaction)
      const balance = roundMoney(toDecimal(invoice.totalAmount).minus(paid))
      if (amount.gt(balance)) {
        throw new ConflictError('Payment amount exceeds the remaining invoice balance.')
      }
      const created = await createPaymentRecord(
        {
          paymentNumber: paymentNumber(),
          invoiceId: invoice.id,
          amount,
          currency: invoice.currency,
          method: input.method,
          externalReference: input.externalReference ?? null,
          receivedByUserId: context.actorUserId,
          status: 'recorded',
        },
        transaction,
      )
      const effectivePaid = roundMoney(paid.plus(amount))
      const totals = {
        subtotal: invoice.subtotal,
        discountAmount: ZERO,
        taxAmount: ZERO,
        totalAmount: invoice.totalAmount,
        amountPaid: effectivePaid,
        balanceAmount: roundMoney(toDecimal(invoice.totalAmount).minus(effectivePaid)),
        status: deriveIssuedStatus(invoice.totalAmount, effectivePaid),
      }
      await updateInvoiceFinancialState(invoice.id, totals, transaction)
      await writeAudit(
        {
          actorUserId: context.actorUserId,
          action: 'payment.create',
          resourceType: 'payment',
          resourceId: created.id,
          outcome: 'success',
          requestId: context.requestId,
          metadata: {
            paymentNumber: created.paymentNumber,
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            amount: amount.toString(),
            currency: invoice.currency,
            method: input.method,
          },
        },
        transaction,
      )
      return created
    })
    return toPaymentDto(payment)
  } catch (error) {
    mapBillingWriteError(error)
  }
}

export async function reversePayment(
  paymentId: string,
  input: ReversePaymentBody,
  context: MutationContext,
): Promise<PaymentDto> {
  try {
    const reversal = await database.client.$transaction(async (transaction) => {
      const original = await findPaymentById(paymentId, transaction)
      if (!original) {
        throw new NotFoundError('Payment was not found.')
      }
      const locked = await lockInvoice(original.invoiceId, transaction)
      if (!locked) {
        throw new NotFoundError('Invoice was not found.')
      }
      const invoice = await findInvoiceById(original.invoiceId, transaction)
      if (!invoice) {
        throw new NotFoundError('Invoice was not found.')
      }
      if (original.reversesPaymentId) {
        throw new ConflictError('A reversal payment cannot be reversed.')
      }
      if (original.status === 'reversed') {
        throw new ConflictError('This payment has already been reversed.')
      }
      if (original.status !== 'recorded') {
        throw new ConflictError('Only recorded payments can be reversed.')
      }
      if (isVoid(invoice.status)) {
        throw new ConflictError('Payments on a void invoice cannot be reversed.')
      }
      const created = await createPaymentRecord(
        {
          paymentNumber: paymentNumber(),
          invoiceId: invoice.id,
          amount: original.amount,
          currency: original.currency,
          method: original.method,
          externalReference: null,
          receivedByUserId: context.actorUserId,
          note: input.reason,
          reversesPaymentId: original.id,
          status: 'recorded',
        },
        transaction,
      )
      await markPaymentReversed(original.id, transaction)
      const effectivePaid = await effectivePaidAmount(invoice.id, transaction)
      const totals = {
        subtotal: invoice.subtotal,
        discountAmount: ZERO,
        taxAmount: ZERO,
        totalAmount: invoice.totalAmount,
        amountPaid: roundMoney(effectivePaid),
        balanceAmount: roundMoney(
          toDecimal(invoice.totalAmount).minus(effectivePaid),
        ),
        status: isDraft(invoice.status)
          ? 'draft'
          : deriveIssuedStatus(invoice.totalAmount, effectivePaid),
      }
      await updateInvoiceFinancialState(invoice.id, totals, transaction)
      await writeAudit(
        {
          actorUserId: context.actorUserId,
          action: 'payment.reverse',
          resourceType: 'payment',
          resourceId: created.id,
          outcome: 'success',
          requestId: context.requestId,
          metadata: {
            paymentNumber: created.paymentNumber,
            originalPaymentId: original.id,
            originalPaymentNumber: original.paymentNumber,
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            amount: original.amount.toString(),
            reason: input.reason,
          },
        },
        transaction,
      )
      return created
    })
    return toPaymentDto(reversal)
  } catch (error) {
    mapBillingWriteError(error)
  }
}

import type { Invoice, InvoiceItem, Patient, Payment, User } from '@prisma/client'
import { decimalString } from './billing.lifecycle.js'

export type BillingPatientDto = {
  id: string
  patientNumber: string
  firstName: string
  lastName: string
  displayName: string
}

export type BillingActorDto = {
  id: string
  username: string
}

export type InvoiceItemDto = {
  id: string
  category: string
  description: string
  quantity: string
  unitPrice: string
  lineTotal: string
  appointmentId: string | null
  labRequestItemId: string | null
  dispenseRecordId: string | null
  createdAt: string
}

export type PaymentDto = {
  id: string
  paymentNumber: string
  invoiceId: string
  amount: string
  currency: string
  method: string
  externalReference: string | null
  status: string
  paidAt: string
  note: string | null
  reversesPaymentId: string | null
  createdAt: string
  receivedBy: BillingActorDto
}

export type InvoiceListItemDto = {
  id: string
  invoiceNumber: string
  patient: BillingPatientDto
  issuedAt: string
  currency: string
  subtotal: string
  discountAmount: string
  taxAmount: string
  totalAmount: string
  amountPaid: string
  balanceAmount: string
  status: string
  createdAt: string
  updatedAt: string
}

export type InvoiceDetailDto = InvoiceListItemDto & {
  createdBy: BillingActorDto
  items: InvoiceItemDto[]
  payments: PaymentDto[]
}

export type ConsultationSourceDto = {
  appointmentId: string
  startsAt: string
  endsAt: string
  doctorDisplayName: string
  billed: boolean
  billedInvoiceId: string | null
  billedInvoiceNumber: string | null
}

export type LaboratorySourceDto = {
  labRequestItemId: string
  testCode: string
  testName: string
  quantity: string
  unitPrice: string
  currency: string
  billed: boolean
  billedInvoiceId: string | null
  billedInvoiceNumber: string | null
}

export type PharmacySourceDto = {
  dispenseRecordId: string
  medicineCode: string
  medicineName: string
  quantity: string
  unit: string
  unitPrice: string
  currency: string
  billed: boolean
  billedInvoiceId: string | null
  billedInvoiceNumber: string | null
}

type BillingPatientSource = Pick<
  Patient,
  'id' | 'patientNumber' | 'firstName' | 'lastName'
>

type PaymentSource = Payment & {
  receivedBy: Pick<User, 'id' | 'username'>
}

type InvoiceListSource = Invoice & {
  patient: BillingPatientSource
}

type InvoiceDetailSource = InvoiceListSource & {
  createdBy: Pick<User, 'id' | 'username'>
  items: InvoiceItem[]
  payments: PaymentSource[]
}

export function toBillingPatientDto(patient: BillingPatientSource): BillingPatientDto {
  return {
    id: patient.id,
    patientNumber: patient.patientNumber,
    firstName: patient.firstName,
    lastName: patient.lastName,
    displayName: `${patient.firstName} ${patient.lastName}`.trim(),
  }
}

export function toInvoiceItemDto(item: InvoiceItem): InvoiceItemDto {
  return {
    id: item.id,
    category: item.category,
    description: item.description,
    quantity: decimalString(item.quantity),
    unitPrice: decimalString(item.unitPrice),
    lineTotal: decimalString(item.lineTotal),
    appointmentId: item.appointmentId,
    labRequestItemId: item.labRequestItemId,
    dispenseRecordId: item.dispenseRecordId,
    createdAt: item.createdAt.toISOString(),
  }
}

export function toPaymentDto(payment: PaymentSource): PaymentDto {
  return {
    id: payment.id,
    paymentNumber: payment.paymentNumber,
    invoiceId: payment.invoiceId,
    amount: decimalString(payment.amount),
    currency: payment.currency,
    method: payment.method,
    externalReference: payment.externalReference,
    status: payment.status,
    paidAt: payment.paidAt.toISOString(),
    note: payment.note,
    reversesPaymentId: payment.reversesPaymentId,
    createdAt: payment.createdAt.toISOString(),
    receivedBy: {
      id: payment.receivedBy.id,
      username: payment.receivedBy.username,
    },
  }
}

export function toInvoiceListItemDto(invoice: InvoiceListSource): InvoiceListItemDto {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    patient: toBillingPatientDto(invoice.patient),
    issuedAt: invoice.issuedAt.toISOString(),
    currency: invoice.currency,
    subtotal: decimalString(invoice.subtotal),
    discountAmount: decimalString(invoice.discountAmount),
    taxAmount: decimalString(invoice.taxAmount),
    totalAmount: decimalString(invoice.totalAmount),
    amountPaid: decimalString(invoice.amountPaid),
    balanceAmount: decimalString(invoice.balanceAmount),
    status: invoice.status,
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
  }
}

export function toInvoiceDetailDto(invoice: InvoiceDetailSource): InvoiceDetailDto {
  return {
    ...toInvoiceListItemDto(invoice),
    createdBy: {
      id: invoice.createdBy.id,
      username: invoice.createdBy.username,
    },
    items: invoice.items.map(toInvoiceItemDto),
    payments: invoice.payments.map(toPaymentDto),
  }
}

export const invoiceStatuses = [
  'draft',
  'issued',
  'partially_paid',
  'paid',
  'void',
] as const
export type InvoiceStatus = (typeof invoiceStatuses)[number]

export const paymentMethods = ['cash', 'card', 'bank_transfer'] as const
export type PaymentMethod = (typeof paymentMethods)[number]

export type BillingPatient = {
  id: string
  patientNumber: string
  firstName: string
  lastName: string
  displayName: string
}

export type BillingActor = {
  id: string
  username: string
}

export type InvoiceItem = {
  id: string
  category: 'consultation' | 'laboratory' | 'pharmacy' | string
  description: string
  quantity: string
  unitPrice: string
  lineTotal: string
  appointmentId: string | null
  labRequestItemId: string | null
  dispenseRecordId: string | null
  createdAt: string
}

export type Payment = {
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
  receivedBy: BillingActor
}

export type InvoiceListItem = {
  id: string
  invoiceNumber: string
  patient: BillingPatient
  issuedAt: string
  currency: string
  subtotal: string
  discountAmount: string
  taxAmount: string
  totalAmount: string
  amountPaid: string
  balanceAmount: string
  status: InvoiceStatus | string
  createdAt: string
  updatedAt: string
}

export type InvoiceDetail = InvoiceListItem & {
  createdBy: BillingActor
  items: InvoiceItem[]
  payments: Payment[]
}

export type ConsultationSource = {
  appointmentId: string
  startsAt: string
  endsAt: string
  doctorDisplayName: string
  billed: boolean
  billedInvoiceId: string | null
  billedInvoiceNumber: string | null
}

export type LaboratorySource = {
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

export type PharmacySource = {
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

export type Pagination = {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export type InvoiceFilters = {
  page: number
  pageSize: number
  search?: string
  status?: InvoiceStatus
  patientId?: string
  sortBy?: 'invoiceNumber' | 'issuedAt' | 'status' | 'totalAmount' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

export type BillingPatientFilters = {
  page: number
  pageSize: number
  search?: string
}

export type InvoiceListResult = {
  data: InvoiceListItem[]
  pagination: Pagination
}

export type BillingPatientListResult = {
  data: BillingPatient[]
  pagination: Pagination
}

export type InvoiceItemInput =
  | {
      category: 'consultation'
      appointmentId: string
      unitPrice: string
    }
  | {
      category: 'laboratory'
      labRequestItemId: string
    }
  | {
      category: 'pharmacy'
      dispenseRecordId: string
    }

export type CreateInvoiceInput = {
  patientId: string
  items: InvoiceItemInput[]
}

export type CreatePaymentInput = {
  amount: string
  method: PaymentMethod
  externalReference?: string | null
}

export function patientLabel(patient: BillingPatient): string {
  return `${patient.displayName} (${patient.patientNumber})`
}

export function moneyLabel(amount: string, currency: string): string {
  return `${amount} ${currency}`
}

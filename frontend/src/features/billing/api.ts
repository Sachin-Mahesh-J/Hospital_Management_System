import { apiClient } from '../../api/client'
import type {
  BillingPatient,
  BillingPatientFilters,
  BillingPatientListResult,
  ConsultationSource,
  CreateInvoiceInput,
  CreatePaymentInput,
  InvoiceDetail,
  InvoiceFilters,
  InvoiceItemInput,
  InvoiceListItem,
  InvoiceListResult,
  LaboratorySource,
  Payment,
  PharmacySource,
} from './types'

type PaginatedInvoices = {
  data: InvoiceListItem[]
  meta: { pagination: InvoiceListResult['pagination'] }
}

type PaginatedPatients = {
  data: BillingPatient[]
  meta: { pagination: BillingPatientListResult['pagination'] }
}

function invoiceQuery(filters: InvoiceFilters): string {
  const params = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize),
  })
  if (filters.search) params.set('search', filters.search)
  if (filters.status) params.set('status', filters.status)
  if (filters.patientId) params.set('patientId', filters.patientId)
  if (filters.sortBy) params.set('sortBy', filters.sortBy)
  if (filters.sortOrder) params.set('sortOrder', filters.sortOrder)
  return params.toString()
}

function patientQuery(filters: BillingPatientFilters): string {
  const params = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize),
  })
  if (filters.search) params.set('search', filters.search)
  return params.toString()
}

export async function fetchInvoices(
  filters: InvoiceFilters,
): Promise<InvoiceListResult> {
  const response = await apiClient.getEnvelope<InvoiceListItem[]>(
    `/invoices?${invoiceQuery(filters)}`,
  ) as PaginatedInvoices
  return { data: response.data, pagination: response.meta.pagination }
}

export function fetchInvoice(id: string): Promise<InvoiceDetail> {
  return apiClient.get<InvoiceDetail>(`/invoices/${id}`)
}

export function createInvoice(input: CreateInvoiceInput): Promise<InvoiceDetail> {
  return apiClient.post<InvoiceDetail>('/invoices', input)
}

export function updateInvoice(
  id: string,
  items: InvoiceItemInput[],
): Promise<InvoiceDetail> {
  return apiClient.patch<InvoiceDetail>(`/invoices/${id}`, { items })
}

export function issueInvoice(id: string): Promise<InvoiceDetail> {
  return apiClient.post<InvoiceDetail>(`/invoices/${id}/issue`)
}

export function voidInvoice(id: string, reason: string): Promise<InvoiceDetail> {
  return apiClient.post<InvoiceDetail>(`/invoices/${id}/void`, { reason })
}

export function fetchInvoicePayments(invoiceId: string): Promise<Payment[]> {
  return apiClient.get<Payment[]>(`/invoices/${invoiceId}/payments`)
}

export function createPayment(
  invoiceId: string,
  input: CreatePaymentInput,
): Promise<Payment> {
  return apiClient.post<Payment>(`/invoices/${invoiceId}/payments`, input)
}

export function reversePayment(paymentId: string, reason: string): Promise<Payment> {
  return apiClient.post<Payment>(`/payments/${paymentId}/reverse`, { reason })
}

export async function fetchBillingPatients(
  filters: BillingPatientFilters,
): Promise<BillingPatientListResult> {
  const response = await apiClient.getEnvelope<BillingPatient[]>(
    `/billing/patients?${patientQuery(filters)}`,
  ) as PaginatedPatients
  return { data: response.data, pagination: response.meta.pagination }
}

export function fetchConsultationSources(
  patientId: string,
): Promise<ConsultationSource[]> {
  return apiClient.get<ConsultationSource[]>(
    `/billing/patients/${patientId}/consultations`,
  )
}

export function fetchLaboratorySources(
  patientId: string,
): Promise<LaboratorySource[]> {
  return apiClient.get<LaboratorySource[]>(
    `/billing/patients/${patientId}/laboratory-items`,
  )
}

export function fetchPharmacySources(patientId: string): Promise<PharmacySource[]> {
  return apiClient.get<PharmacySource[]>(
    `/billing/patients/${patientId}/dispenses`,
  )
}

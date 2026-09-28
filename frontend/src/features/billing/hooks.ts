import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  createInvoice,
  createPayment,
  fetchBillingPatients,
  fetchConsultationSources,
  fetchInvoice,
  fetchInvoicePayments,
  fetchInvoices,
  fetchLaboratorySources,
  fetchPharmacySources,
  issueInvoice,
  reversePayment,
  updateInvoice,
  voidInvoice,
} from './api'
import type {
  BillingPatientFilters,
  CreateInvoiceInput,
  CreatePaymentInput,
  InvoiceFilters,
  InvoiceItemInput,
} from './types'

export const billingKeys = {
  all: ['billing'] as const,
  invoices: () => [...billingKeys.all, 'invoices'] as const,
  invoiceList: (filters: InvoiceFilters) =>
    [...billingKeys.invoices(), filters] as const,
  invoice: (id: string) => [...billingKeys.invoices(), 'detail', id] as const,
  payments: (invoiceId: string) =>
    [...billingKeys.all, 'payments', invoiceId] as const,
  patients: () => [...billingKeys.all, 'patients'] as const,
  patientList: (filters: BillingPatientFilters) =>
    [...billingKeys.patients(), filters] as const,
  sources: (patientId: string) =>
    [...billingKeys.all, 'sources', patientId] as const,
}

async function invalidateBilling(
  queryClient: ReturnType<typeof useQueryClient>,
  invoiceId?: string,
) {
  await queryClient.invalidateQueries({ queryKey: billingKeys.all })
  if (invoiceId) {
    await queryClient.invalidateQueries({ queryKey: billingKeys.invoice(invoiceId) })
    await queryClient.invalidateQueries({ queryKey: billingKeys.payments(invoiceId) })
  }
}

export function useInvoices(filters: InvoiceFilters, enabled = true) {
  return useQuery({
    queryKey: billingKeys.invoiceList(filters),
    queryFn: () => fetchInvoices(filters),
    enabled,
    placeholderData: (previous) => previous,
  })
}

export function useInvoice(id: string, enabled = true) {
  return useQuery({
    queryKey: billingKeys.invoice(id),
    queryFn: () => fetchInvoice(id),
    enabled: enabled && id.length > 0,
  })
}

export function useInvoicePayments(invoiceId: string, enabled = true) {
  return useQuery({
    queryKey: billingKeys.payments(invoiceId),
    queryFn: () => fetchInvoicePayments(invoiceId),
    enabled: enabled && invoiceId.length > 0,
  })
}

export function useBillingPatients(filters: BillingPatientFilters, enabled = true) {
  return useQuery({
    queryKey: billingKeys.patientList(filters),
    queryFn: () => fetchBillingPatients(filters),
    enabled,
    placeholderData: (previous) => previous,
  })
}

export function useBillableSources(patientId: string, enabled = true) {
  return useQuery({
    queryKey: billingKeys.sources(patientId),
    queryFn: async () => {
      const [consultations, laboratoryItems, dispenses] = await Promise.all([
        fetchConsultationSources(patientId),
        fetchLaboratorySources(patientId),
        fetchPharmacySources(patientId),
      ])
      return { consultations, laboratoryItems, dispenses }
    },
    enabled: enabled && patientId.length > 0,
  })
}

export function useCreateInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateInvoiceInput) => createInvoice(input),
    onSuccess: async (invoice) => {
      await invalidateBilling(queryClient, invoice.id)
    },
  })
}

export function useUpdateInvoice(invoiceId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (items: InvoiceItemInput[]) => updateInvoice(invoiceId, items),
    onSuccess: async () => {
      await invalidateBilling(queryClient, invoiceId)
    },
  })
}

export function useIssueInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => issueInvoice(id),
    onSuccess: async (invoice) => {
      await invalidateBilling(queryClient, invoice.id)
    },
  })
}

export function useVoidInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      voidInvoice(id, reason),
    onSuccess: async (invoice) => {
      await invalidateBilling(queryClient, invoice.id)
    },
  })
}

export function useCreatePayment(invoiceId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreatePaymentInput) => createPayment(invoiceId, input),
    onSuccess: async () => {
      await invalidateBilling(queryClient, invoiceId)
    },
  })
}

export function useReversePayment(invoiceId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ paymentId, reason }: { paymentId: string; reason: string }) =>
      reversePayment(paymentId, reason),
    onSuccess: async () => {
      await invalidateBilling(queryClient, invoiceId)
    },
  })
}

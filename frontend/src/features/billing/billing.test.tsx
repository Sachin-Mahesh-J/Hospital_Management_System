import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { AuthContext, type AuthContextValue } from '../../auth/authContext'
import { AppShell } from '../../app/AppShell'
import { NotificationProvider } from '../../shared/notifications/NotificationProvider'
import * as billingApi from './api'
import { InvoiceCreatePage } from './InvoiceCreatePage'
import { InvoiceDetailPage } from './InvoiceDetailPage'
import { InvoiceListPage } from './InvoiceListPage'
import { PaymentReceiptPage } from './PaymentReceiptPage'
import type { InvoiceDetail, InvoiceListItem } from './types'

vi.mock('./api')

const patient = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  patientNumber: 'P-1',
  firstName: 'Fictional',
  lastName: 'Patient',
  displayName: 'Fictional Patient',
}

const invoice: InvoiceListItem = {
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  invoiceNumber: 'INV-11111111-1111-4111-8111-111111111111',
  patient,
  issuedAt: '2026-01-02T00:00:00.000Z',
  currency: 'LKR',
  subtotal: '100.0000',
  discountAmount: '0',
  taxAmount: '0',
  totalAmount: '100.0000',
  amountPaid: '40.0000',
  balanceAmount: '60.0000',
  status: 'partially_paid',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
}

const detail: InvoiceDetail = {
  ...invoice,
  createdBy: { id: 'user-1', username: 'accountant' },
  items: [{
    id: 'item-1',
    category: 'consultation',
    description: 'Consultation with Dr Example',
    quantity: '1',
    unitPrice: '100.0000',
    lineTotal: '100.0000',
    appointmentId: 'appt-1',
    labRequestItemId: null,
    dispenseRecordId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
  }],
  payments: [{
    id: 'pay-1',
    paymentNumber: 'PAY-22222222-2222-4222-8222-222222222222',
    invoiceId: invoice.id,
    amount: '40.0000',
    currency: 'LKR',
    method: 'cash',
    externalReference: null,
    status: 'recorded',
    paidAt: '2026-01-02T00:00:00.000Z',
    note: null,
    reversesPaymentId: null,
    createdAt: '2026-01-02T00:00:00.000Z',
    receivedBy: { id: 'user-1', username: 'accountant' },
  }],
}

function createClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}

function authValue(permissions: string[], roles = ['accountant']): AuthContextValue {
  return {
    user: {
      id: 'user-1',
      username: 'accountant',
      roles,
      permissions,
    },
    isBootstrapping: false,
    login: async () => undefined,
    logout: async () => undefined,
    changePassword: async () => undefined,
  }
}

function renderPage(ui: ReactNode, permissions: string[]) {
  return render(
    <QueryClientProvider client={createClient()}>
      <NotificationProvider>
        <AuthContext value={authValue(permissions)}>
          <MemoryRouter>
            {ui}
          </MemoryRouter>
        </AuthContext>
      </NotificationProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('billing navigation', () => {
  it('shows Billing for invoice.read and hides it from other roles', () => {
    const { unmount } = render(
      <MemoryRouter>
        <AuthContext value={authValue(['invoice.read'])}>
          <AppShell />
        </AuthContext>
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Billing' })).toBeVisible()
    unmount()

    render(
      <MemoryRouter>
        <AuthContext value={authValue([], ['doctor'])}>
          <AppShell />
        </AuthContext>
      </MemoryRouter>,
    )
    expect(screen.queryByRole('link', { name: 'Billing' })).toBeNull()
  })
})

describe('billing pages', () => {
  it('lists invoices from the server', async () => {
    vi.mocked(billingApi.fetchInvoices).mockResolvedValue({
      data: [invoice],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    })
    renderPage(<InvoiceListPage />, ['invoice.read', 'invoice.create'])
    expect(await screen.findByText(invoice.invoiceNumber)).toBeVisible()
    expect(screen.getByRole('link', { name: 'Create invoice' })).toBeVisible()
  })

  it('creates a draft after selecting a patient and consultation', async () => {
    vi.mocked(billingApi.fetchBillingPatients).mockResolvedValue({
      data: [patient],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    })
    vi.mocked(billingApi.fetchConsultationSources).mockResolvedValue([{
      appointmentId: 'appt-1',
      startsAt: '2026-01-01T10:00:00.000Z',
      endsAt: '2026-01-01T10:30:00.000Z',
      doctorDisplayName: 'Fictional Doctor',
      billed: false,
      billedInvoiceId: null,
      billedInvoiceNumber: null,
    }])
    vi.mocked(billingApi.fetchLaboratorySources).mockResolvedValue([])
    vi.mocked(billingApi.fetchPharmacySources).mockResolvedValue([])
    vi.mocked(billingApi.createInvoice).mockResolvedValue(detail)

    renderPage(<InvoiceCreatePage />, ['invoice.create', 'invoice.read'])
    fireEvent.click(await screen.findByRole('button', { name: 'Search' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Select' }))
    fireEvent.click(await screen.findByRole('checkbox'))
    fireEvent.change(screen.getByLabelText('Unit price'), { target: { value: '100' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create draft invoice' }))
    await waitFor(() => {
      expect(billingApi.createInvoice).toHaveBeenCalledWith({
        patientId: patient.id,
        items: [{
          category: 'consultation',
          appointmentId: 'appt-1',
          unitPrice: '100',
        }],
      })
    })
  })

  it('shows invoice detail, payment, and receipt data from the server', async () => {
    vi.mocked(billingApi.fetchInvoice).mockResolvedValue(detail)
    render(
      <QueryClientProvider client={createClient()}>
        <NotificationProvider>
          <AuthContext value={authValue(['invoice.read', 'payment.read', 'payment.create', 'invoice.void'])}>
            <MemoryRouter initialEntries={[`/billing/${invoice.id}`]}>
              <Routes>
                <Route path="/billing/:invoiceId" element={<InvoiceDetailPage />} />
              </Routes>
            </MemoryRouter>
          </AuthContext>
        </NotificationProvider>
      </QueryClientProvider>,
    )
    expect(await screen.findByText(invoice.invoiceNumber)).toBeVisible()
    expect(screen.getByText(/Consultation with Dr Example/)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Record payment' })).toBeVisible()

    vi.mocked(billingApi.fetchInvoice).mockResolvedValue(detail)
    render(
      <QueryClientProvider client={createClient()}>
        <AuthContext value={authValue(['payment.read'])}>
          <MemoryRouter initialEntries={[`/billing/${invoice.id}/payments/pay-1`]}>
            <Routes>
              <Route path="/billing/:invoiceId/payments/:paymentId" element={<PaymentReceiptPage />} />
            </Routes>
          </MemoryRouter>
        </AuthContext>
      </QueryClientProvider>,
    )
    expect(await screen.findByText('PAY-22222222-2222-4222-8222-222222222222')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Print receipt' })).toBeVisible()
  })
})

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { ApiError } from '../../api/client'
import { AuthContext, type AuthContextValue } from '../../auth/authContext'
import { AppShell } from '../../app/AppShell'
import { appRoutes } from '../../app/routes'
import { HomePage } from '../../pages/HomePage'
import { NotificationProvider } from '../../shared/notifications/NotificationProvider'
import * as healthApi from '../../api/health'
import * as reportApi from './api'
import { PatientReportPage } from './PatientReportPage'
import { ReportsHomePage } from './ReportsHomePage'
import type { Dashboard, PatientReportRow } from './types'

vi.mock('./api')
vi.mock('../../api/health')

const patientRow: PatientReportRow = {
  id: '11111111-1111-4111-8111-111111111111',
  patientNumber: 'P-11111111-1111-4111-8111-111111111111',
  firstName: 'Fictional',
  lastName: 'Patient',
  dateOfBirth: '1990-01-01',
  dateOfBirthPrecision: 'year',
  sexAtRegistration: 'unknown',
  status: 'active',
  createdAt: '2026-01-01T00:00:00.000Z',
}

function createClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}

function authValue(permissions: string[], username = 'admin'): AuthContextValue {
  return {
    user: {
      id: 'user-1',
      username,
      roles: ['administrator'],
      permissions,
    },
    isBootstrapping: false,
    login: async () => undefined,
    logout: async () => undefined,
    changePassword: async () => undefined,
  }
}

function renderWithAuth(ui: ReactNode, permissions: string[]) {
  return render(
    <QueryClientProvider client={createClient()}>
      <NotificationProvider>
        <AuthContext value={authValue(permissions)}>
          <MemoryRouter>{ui}</MemoryRouter>
        </AuthContext>
      </NotificationProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(healthApi.getHealth).mockResolvedValue({
    status: 'ok',
    service: 'hms-api',
    timestamp: '2026-09-28T00:00:00.000Z',
  })
})

describe('report navigation', () => {
  it('shows the Reports menu only when at least one report permission is present', () => {
    const { unmount } = renderWithAuth(<AppShell />, ['report.revenue.read'])
    expect(screen.getByRole('link', { name: 'Reports' })).toBeVisible()
    unmount()

    renderWithAuth(<AppShell />, ['patient.read'])
    expect(screen.queryByRole('link', { name: 'Reports' })).not.toBeInTheDocument()
  })

  it('lists only reports the current user can access', () => {
    renderWithAuth(<ReportsHomePage />, ['report.revenue.read'])
    expect(screen.getByRole('link', { name: /Revenue report/ })).toBeVisible()
    expect(screen.queryByRole('link', { name: /Patient report/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Laboratory report/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Pharmacy report/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Staff report/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Appointment report/ })).not.toBeInTheDocument()
  })

  it('blocks report routes without the dedicated permission', async () => {
    const router = createMemoryRouter(appRoutes, {
      initialEntries: ['/reports/patients'],
    })
    render(
      <AuthContext value={authValue(['report.revenue.read'], 'accountant')}>
        <RouterProvider router={router} />
      </AuthContext>,
    )
    expect(
      await screen.findByText('You are not authorized to access this page.'),
    ).toBeVisible()
  })
})

describe('dashboard metric visibility', () => {
  it('renders only authorized dashboard metrics', async () => {
    const dashboard: Dashboard = {
      hospitalDate: '2026-09-28',
      currency: 'LKR',
      revenueSummary: {
        currency: 'LKR',
        paymentCount: 2,
        totalAmount: '150.0000',
      },
    }
    vi.mocked(reportApi.fetchDashboard).mockResolvedValue(dashboard)
    renderWithAuth(<HomePage />, ['report.revenue.read'])
    expect(await screen.findByText('Revenue')).toBeVisible()
    expect(screen.getByText('LKR 150.0000')).toBeVisible()
    expect(screen.queryByText('Total patients')).not.toBeInTheDocument()
    expect(screen.queryByText("Today's appointments")).not.toBeInTheDocument()
    expect(screen.queryByText('Laboratory requests')).not.toBeInTheDocument()
    expect(screen.queryByText('Pharmacy alerts')).not.toBeInTheDocument()
  })

  it('does not fetch or render M14 metrics without report permissions', async () => {
    renderWithAuth(<HomePage />, ['patient.read'])
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeVisible()
    expect(reportApi.fetchDashboard).not.toHaveBeenCalled()
    expect(screen.queryByText('Total patients')).not.toBeInTheDocument()
    expect(screen.queryByText('Revenue')).not.toBeInTheDocument()
  })
})

describe('patient report', () => {
  it('shows loading, data, empty, error, filters, and print', async () => {
    let resolve!: (value: Awaited<ReturnType<typeof reportApi.fetchPatientReport>>) => void
    vi.mocked(reportApi.fetchPatientReport).mockReturnValue(
      new Promise((done) => {
        resolve = done
      }),
    )
    const { unmount } = renderWithAuth(<PatientReportPage />, ['report.patient.read'])
    expect(screen.getByRole('status')).toHaveTextContent('Loading patient report')
    resolve({
      data: [patientRow],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    })
    expect(await screen.findByText(patientRow.patientNumber)).toBeVisible()
    expect(screen.getByText('Fictional Patient')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Print' })).toBeVisible()
    unmount()

    vi.mocked(reportApi.fetchPatientReport).mockRejectedValueOnce(
      new ApiError('Report unavailable.', 503),
    )
    const errorView = renderWithAuth(<PatientReportPage />, ['report.patient.read'])
    expect(await screen.findByText('Report unavailable.')).toBeVisible()
    errorView.unmount()

    vi.mocked(reportApi.fetchPatientReport).mockResolvedValue({
      data: [],
      pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
    })
    renderWithAuth(<PatientReportPage />, ['report.patient.read'])
    expect(await screen.findByRole('heading', { name: 'No patients found' })).toBeVisible()
    fireEvent.mouseDown(screen.getByLabelText('Status'))
    fireEvent.click(await screen.findByRole('option', { name: 'inactive' }))
    await waitFor(() => {
      expect(reportApi.fetchPatientReport).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'inactive', page: 1 }),
      )
    })
  })
})

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../../auth/authContext'
import { AppShell } from '../../app/AppShell'
import { NotificationProvider } from '../../shared/notifications/NotificationProvider'
import * as laboratoryApi from './api'
import { LaboratoryCreatePage } from './LaboratoryCreatePage'
import { LaboratoryDetailPage } from './LaboratoryDetailPage'
import { LaboratoryListPage } from './LaboratoryListPage'
import { LaboratoryReportPage } from './LaboratoryReportPage'
import { useCollectLabSample, useCreateLabRequest } from './hooks'
import type { LabRequest, LabTestCatalogItem } from './types'

vi.mock('./api')
vi.mock('../patients/hooks', () => ({
  usePatients: () => ({
    data: {
      data: [{
        id: '11111111-1111-4111-8111-111111111111',
        patientNumber: 'P-1',
        firstName: 'Fictional',
        lastName: 'Patient',
        status: 'active',
      }],
      pagination: { page: 1, pageSize: 100, totalItems: 1, totalPages: 1 },
    },
    isLoading: false,
    isError: false,
  }),
}))

const testDefinition: LabTestCatalogItem = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  code: 'CBC',
  name: 'Complete blood count',
  status: 'active',
}

const request: LabRequest = {
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  patientId: '11111111-1111-4111-8111-111111111111',
  requestedByDoctorId: '44444444-4444-4444-8444-444444444444',
  medicalRecordId: null,
  requestedAt: '2030-03-01T14:00:00.000Z',
  status: 'requested',
  clinicalNote: 'Fictional note',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  itemCount: 1,
  patient: {
    id: '11111111-1111-4111-8111-111111111111',
    patientNumber: 'P-1',
    firstName: 'Fictional',
    lastName: 'Patient',
    status: 'active',
  },
  requestedBy: {
    id: '44444444-4444-4444-8444-444444444444',
    licenseNumber: 'LIC-1',
    specialization: 'General',
    status: 'active',
    employee: {
      id: '33333333-3333-4333-8333-333333333333',
      employeeNumber: 'E-1',
      firstName: 'Fictional',
      lastName: 'Clinician',
      employmentStatus: 'active',
    },
  },
  items: [{
    id: 'item-1',
    testDefinitionId: testDefinition.id,
    status: 'requested',
    sampleCollectedAt: null,
    sampleCollectedByEmployeeId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    testDefinition,
    sampleCollectedBy: null,
    results: [],
  }],
}

function createClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}

function authValue(permissions: string[], roles = ['doctor']): AuthContextValue {
  return {
    user: {
      id: 'user-1',
      username: 'clinician',
      roles,
      permissions,
    },
    isBootstrapping: false,
    login: async () => undefined,
    logout: async () => undefined,
    changePassword: async () => undefined,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('laboratory navigation', () => {
  it('shows Laboratory for nurse, doctor, administrator, and laboratory staff', () => {
    for (const [role, permission] of [
      ['nurse', 'lab_request.read'],
      ['doctor', 'lab_request.read'],
      ['administrator', 'lab_request.read'],
      ['laboratory_staff', 'lab_request.read'],
    ] as const) {
      const { unmount } = render(
        <MemoryRouter>
          <AuthContext value={authValue([permission], [role])}>
            <AppShell />
          </AuthContext>
        </MemoryRouter>,
      )
      expect(screen.getByRole('link', { name: 'Laboratory' })).toBeVisible()
      unmount()
    }
  })

  it('hides Laboratory for receptionist, pharmacist, and accountant', () => {
    for (const role of ['receptionist', 'pharmacist', 'accountant']) {
      const { unmount } = render(
        <MemoryRouter>
          <AuthContext value={authValue([], [role])}>
            <AppShell />
          </AuthContext>
        </MemoryRouter>,
      )
      expect(screen.queryByRole('link', { name: 'Laboratory' })).toBeNull()
      unmount()
    }
  })
})

describe('laboratory list and empty state', () => {
  it('lists requests and shows an empty state', async () => {
    vi.mocked(laboratoryApi.fetchLabRequests).mockResolvedValue({
      data: [request],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    })
    const { unmount } = render(
      <QueryClientProvider client={createClient()}>
        <AuthContext value={authValue(['lab_request.read', 'lab_request.create'])}>
          <MemoryRouter>
            <LaboratoryListPage />
          </MemoryRouter>
        </AuthContext>
      </QueryClientProvider>,
    )
    expect(await screen.findByText('Fictional Patient (P-1)')).toBeVisible()
    expect(screen.getByRole('link', { name: 'New request' })).toBeVisible()
    unmount()

    vi.mocked(laboratoryApi.fetchLabRequests).mockResolvedValue({
      data: [],
      pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
    })
    render(
      <QueryClientProvider client={createClient()}>
        <AuthContext value={authValue(['lab_request.read'])}>
          <MemoryRouter>
            <LaboratoryListPage />
          </MemoryRouter>
        </AuthContext>
      </QueryClientProvider>,
    )
    expect(await screen.findByText('No laboratory requests found')).toBeVisible()
    expect(screen.queryByRole('link', { name: 'New request' })).toBeNull()
  })
})

describe('laboratory request creation', () => {
  it('allows duplicate tests on one request', async () => {
    vi.mocked(laboratoryApi.fetchLabTests).mockResolvedValue({
      data: [testDefinition],
      pagination: { page: 1, pageSize: 100, totalItems: 1, totalPages: 1 },
    })
    vi.mocked(laboratoryApi.createLabRequest).mockResolvedValue(request)
    render(
      <QueryClientProvider client={createClient()}>
        <NotificationProvider>
          <AuthContext value={authValue(['lab_request.create', 'lab_test.read', 'patient.read'])}>
            <MemoryRouter>
              <LaboratoryCreatePage />
            </MemoryRouter>
          </AuthContext>
        </NotificationProvider>
      </QueryClientProvider>,
    )
    fireEvent.mouseDown(await screen.findByLabelText(/^Patient/))
    fireEvent.click(await screen.findByRole('option', { name: /Fictional Patient/ }))
    fireEvent.mouseDown(screen.getByLabelText(/^Laboratory test/))
    fireEvent.click(screen.getByRole('option', { name: /Complete blood count/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Add test' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add test' }))
    fireEvent.click(screen.getByRole('button', { name: 'Create request' }))
    await waitFor(() =>
      expect(laboratoryApi.createLabRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: request.patientId,
          items: [
            { testDefinitionId: testDefinition.id },
            { testDefinitionId: testDefinition.id },
          ],
        }),
      ),
    )
  })
})

describe('sample collection and result entry', () => {
  it('collects a sample and hides the action without permission', async () => {
    vi.mocked(laboratoryApi.fetchLabRequest).mockResolvedValue(request)
    vi.mocked(laboratoryApi.collectLabSample).mockResolvedValue({
      ...request,
      status: 'sample_collected',
      items: [{
        ...request.items[0]!,
        status: 'sample_collected',
        sampleCollectedAt: '2030-03-01T15:00:00.000Z',
        sampleCollectedByEmployeeId: '55555555-5555-4555-8555-555555555555',
        sampleCollectedBy: {
          id: '55555555-5555-4555-8555-555555555555',
          employeeNumber: 'E-2',
          firstName: 'Fictional',
          lastName: 'Analyst',
          employmentStatus: 'active',
        },
      }],
    })
    const { unmount } = render(
      <QueryClientProvider client={createClient()}>
        <NotificationProvider>
          <AuthContext value={authValue(['lab_request.read', 'lab_sample.collect'], ['laboratory_staff'])}>
            <MemoryRouter initialEntries={[`/laboratory/${request.id}`]}>
              <Routes>
                <Route path="/laboratory/:requestId" element={<LaboratoryDetailPage />} />
              </Routes>
            </MemoryRouter>
          </AuthContext>
        </NotificationProvider>
      </QueryClientProvider>,
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Collect sample' }))
    await waitFor(() =>
      expect(laboratoryApi.collectLabSample).toHaveBeenCalledWith(request.id, 'item-1'),
    )
    unmount()

    render(
      <QueryClientProvider client={createClient()}>
        <NotificationProvider>
          <AuthContext value={authValue(['lab_request.read'])}>
            <MemoryRouter initialEntries={[`/laboratory/${request.id}`]}>
              <Routes>
                <Route path="/laboratory/:requestId" element={<LaboratoryDetailPage />} />
              </Routes>
            </MemoryRouter>
          </AuthContext>
        </NotificationProvider>
      </QueryClientProvider>,
    )
    expect(await screen.findByText(/Complete blood count/)).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Collect sample' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Enter result' })).toBeNull()
  })

  it('enters a result when the item is collected', async () => {
    const collected: LabRequest = {
      ...request,
      status: 'sample_collected',
      items: [{
        ...request.items[0]!,
        status: 'sample_collected',
        sampleCollectedAt: '2030-03-01T15:00:00.000Z',
        sampleCollectedByEmployeeId: '55555555-5555-4555-8555-555555555555',
        sampleCollectedBy: {
          id: '55555555-5555-4555-8555-555555555555',
          employeeNumber: 'E-2',
          firstName: 'Fictional',
          lastName: 'Analyst',
          employmentStatus: 'active',
        },
      }],
    }
    vi.mocked(laboratoryApi.fetchLabRequest).mockResolvedValue(collected)
    vi.mocked(laboratoryApi.enterLabResult).mockResolvedValue(collected)
    render(
      <QueryClientProvider client={createClient()}>
        <NotificationProvider>
          <AuthContext value={authValue(['lab_request.read', 'lab_result.enter'], ['laboratory_staff'])}>
            <MemoryRouter initialEntries={[`/laboratory/${request.id}`]}>
              <Routes>
                <Route path="/laboratory/:requestId" element={<LaboratoryDetailPage />} />
              </Routes>
            </MemoryRouter>
          </AuthContext>
        </NotificationProvider>
      </QueryClientProvider>,
    )
    fireEvent.change(await screen.findByLabelText(/^Result value/), {
      target: { value: 'negative' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Enter result' }))
    await waitFor(() =>
      expect(laboratoryApi.enterLabResult).toHaveBeenCalledWith(
        request.id,
        'item-1',
        expect.objectContaining({ resultValue: 'negative' }),
      ),
    )
  })
})

describe('laboratory report', () => {
  it('renders stored fields and uses browser print', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined)
    vi.mocked(laboratoryApi.fetchLabRequest).mockResolvedValue({
      ...request,
      status: 'completed',
      items: [{
        ...request.items[0]!,
        status: 'completed',
        sampleCollectedAt: '2030-03-01T15:00:00.000Z',
        sampleCollectedByEmployeeId: '55555555-5555-4555-8555-555555555555',
        sampleCollectedBy: {
          id: '55555555-5555-4555-8555-555555555555',
          employeeNumber: 'E-2',
          firstName: 'Fictional',
          lastName: 'Analyst',
          employmentStatus: 'active',
        },
        results: [{
          id: 'result-1',
          versionNumber: 1,
          resultValue: 'negative',
          resultUnit: null,
          referenceRangeSnapshot: null,
          resultNote: null,
          enteredAt: '2030-03-01T16:00:00.000Z',
          enteredByEmployeeId: '55555555-5555-4555-8555-555555555555',
          enteredBy: {
            id: '55555555-5555-4555-8555-555555555555',
            employeeNumber: 'E-2',
            firstName: 'Fictional',
            lastName: 'Analyst',
            employmentStatus: 'active',
          },
        }],
      }],
    })
    render(
      <QueryClientProvider client={createClient()}>
        <AuthContext value={authValue(['lab_request.read'])}>
          <MemoryRouter initialEntries={[`/laboratory/${request.id}/report`]}>
            <Routes>
              <Route path="/laboratory/:requestId/report" element={<LaboratoryReportPage />} />
            </Routes>
          </MemoryRouter>
        </AuthContext>
      </QueryClientProvider>,
    )
    expect(await screen.findByText('negative')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Laboratory report' })).toBeVisible()
    expect(screen.queryByText(/abnormal/i)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Print report' }))
    expect(print).toHaveBeenCalled()
    print.mockRestore()
  })
})

describe('laboratory query invalidation', () => {
  it('updates detail cache after create and collection', async () => {
    vi.mocked(laboratoryApi.createLabRequest).mockResolvedValue(request)
    vi.mocked(laboratoryApi.collectLabSample).mockResolvedValue({
      ...request,
      status: 'sample_collected',
    })
    const client = createClient()
    const created = renderHook(() => useCreateLabRequest(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    })
    await created.result.current.mutateAsync({
      patientId: request.patientId,
      items: [{ testDefinitionId: testDefinition.id }],
    })
    expect(client.getQueryData(['laboratory', 'request', request.id])).toEqual(request)

    const collected = renderHook(() => useCollectLabSample(request.id), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    })
    await collected.result.current.mutateAsync('item-1')
    expect(client.getQueryData(['laboratory', 'request', request.id])).toMatchObject({
      status: 'sample_collected',
    })
  })
})

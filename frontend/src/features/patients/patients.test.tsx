import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../api/client'
import { AuthContext, type AuthContextValue } from '../../auth/authContext'
import { NotificationProvider } from '../../shared/notifications/NotificationProvider'
import * as patientApi from './api'
import { useUpdatePatient } from './hooks'
import { PatientListPage } from './PatientListPage'
import { PatientRegisterPage } from './PatientRegisterPage'
import type { Patient } from './types'

vi.mock('./api')

const patient: Patient = {
  id: '11111111-1111-4111-8111-111111111111',
  patientNumber: 'P-11111111-1111-4111-8111-111111111111',
  firstName: 'Fictional',
  lastName: 'Patient',
  dateOfBirth: '1990-01-01',
  dateOfBirthPrecision: 'year',
  sexAtRegistration: 'unknown',
  phone: '555-0101',
  email: 'fictional@example.test',
  addressText: 'Test address',
  emergencyContactName: null,
  emergencyContactPhone: null,
  status: 'active',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function createClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}

function renderList(
  client = createClient(),
  permissions = ['patient.read', 'patient.create', 'patient.update'],
) {
  const auth: AuthContextValue = {
    user: {
      id: 'user-1',
      username: 'receptionist',
      roles: ['receptionist'],
      permissions,
    },
    isBootstrapping: false,
    login: async () => undefined,
    logout: async () => undefined,
    changePassword: async () => undefined,
  }
  return render(
    <QueryClientProvider client={client}>
      <AuthContext value={auth}>
        <MemoryRouter>
          <PatientListPage />
        </MemoryRouter>
      </AuthContext>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('patient list', () => {
  it('shows loading and successful patient data', async () => {
    let resolve!: (value: Awaited<ReturnType<typeof patientApi.fetchPatients>>) => void
    vi.mocked(patientApi.fetchPatients).mockReturnValue(
      new Promise((done) => { resolve = done }),
    )
    renderList()
    expect(screen.getByRole('status')).toHaveTextContent('Loading patients')

    resolve({
      data: [patient],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    })
    expect(await screen.findByText(patient.patientNumber)).toBeVisible()
    expect(screen.getByText('Fictional Patient')).toBeVisible()
  })

  it('shows request errors and empty results', async () => {
    vi.mocked(patientApi.fetchPatients).mockRejectedValueOnce(
      new ApiError('Patient service unavailable.', 503),
    )
    const { unmount } = renderList()
    expect(await screen.findByText('Patient service unavailable.')).toBeVisible()
    unmount()

    vi.mocked(patientApi.fetchPatients).mockResolvedValueOnce({
      data: [],
      pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
    })
    renderList()
    expect(await screen.findByRole('heading', { name: 'No patients found' })).toBeVisible()
  })

  it('submits search text through the query hook', async () => {
    vi.mocked(patientApi.fetchPatients).mockResolvedValue({
      data: [],
      pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
    })
    renderList()
    await screen.findByRole('heading', { name: 'No patients found' })
    fireEvent.change(screen.getByLabelText(/Search by number/), {
      target: { value: 'Fictional' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    await waitFor(() =>
      expect(patientApi.fetchPatients).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'Fictional', page: 1 }),
      ),
    )
  })

  it('filters by status and paginates', async () => {
    vi.mocked(patientApi.fetchPatients).mockResolvedValue({
      data: [patient],
      pagination: { page: 1, pageSize: 20, totalItems: 21, totalPages: 2 },
    })
    renderList()
    expect(await screen.findByText(patient.patientNumber)).toBeVisible()

    fireEvent.mouseDown(screen.getByLabelText('Status'))
    fireEvent.click(await screen.findByRole('option', { name: 'active' }))
    await waitFor(() =>
      expect(patientApi.fetchPatients).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'active', page: 1 }),
      ),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Go to page 2' }))
    await waitFor(() =>
      expect(patientApi.fetchPatients).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2, status: 'active' }),
      ),
    )
  })

  it('hides registration when the user cannot create patients', async () => {
    vi.mocked(patientApi.fetchPatients).mockResolvedValue({
      data: [patient],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    })
    renderList(createClient(), ['patient.read'])
    expect(await screen.findByText(patient.patientNumber)).toBeVisible()
    expect(screen.queryByRole('link', { name: 'Register patient' })).toBeNull()
  })
})

describe('patient registration and query invalidation', () => {
  it('registers a valid patient and navigates to details', async () => {
    vi.mocked(patientApi.createPatient).mockResolvedValue(patient)
    const client = createClient()
    render(
      <QueryClientProvider client={client}>
        <NotificationProvider>
          <MemoryRouter initialEntries={['/patients/new']}>
            <Routes>
              <Route path="/patients/new" element={<PatientRegisterPage />} />
              <Route path="/patients/:patientId" element={<div>Patient details destination</div>} />
            </Routes>
          </MemoryRouter>
        </NotificationProvider>
      </QueryClientProvider>,
    )
    fireEvent.change(screen.getByLabelText(/First name/), { target: { value: 'Fictional' } })
    fireEvent.change(screen.getByLabelText(/Last name/), { target: { value: 'Patient' } })
    fireEvent.change(screen.getByLabelText(/Date of birth/), { target: { value: '1990-01-01' } })
    fireEvent.click(screen.getByRole('button', { name: 'Register patient' }))
    expect(await screen.findByText('Patient details destination')).toBeVisible()
    expect(patientApi.createPatient).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: 'Fictional',
        dateOfBirth: '1990-01-01',
        dateOfBirthPrecision: 'exact',
      }),
    )
  })

  it('rejects a future date before mutation', async () => {
    const client = createClient()
    render(
      <QueryClientProvider client={client}>
        <NotificationProvider>
          <MemoryRouter>
            <PatientRegisterPage />
          </MemoryRouter>
        </NotificationProvider>
      </QueryClientProvider>,
    )
    fireEvent.change(screen.getByLabelText(/First name/), { target: { value: 'Future' } })
    fireEvent.change(screen.getByLabelText(/Last name/), { target: { value: 'Patient' } })
    fireEvent.change(screen.getByLabelText(/Date of birth/), { target: { value: '2999-01-01' } })
    fireEvent.submit(screen.getByRole('button', { name: 'Register patient' }).closest('form')!)
    expect(await screen.findByText('Date of birth cannot be in the future.')).toBeVisible()
    expect(patientApi.createPatient).not.toHaveBeenCalled()
  })

  it('invalidates detail and list queries after an update', async () => {
    vi.mocked(patientApi.updatePatient).mockResolvedValue({
      ...patient,
      phone: '555-0199',
    })
    const client = createClient()
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(() => useUpdatePatient(patient.id), { wrapper })
    await result.current.mutateAsync({ phone: '555-0199' })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['patients', 'list'] })
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['patients', 'detail', patient.id],
    })
  })
})

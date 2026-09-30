import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../api/client'
import { AppShell } from '../../app/AppShell'
import { AuthContext, type AuthContextValue } from '../../auth/authContext'
import { NotificationProvider } from '../../shared/notifications/NotificationProvider'
import * as doctorApi from '../doctors/api'
import * as patientApi from '../patients/api'
import { AdmissionCreatePage } from './AdmissionCreatePage'
import { AdmissionDetailPage } from './AdmissionDetailPage'
import { AdmissionListPage } from './AdmissionListPage'
import * as admissionApi from './api'
import type { Admission } from './types'

vi.mock('./api')
vi.mock('../patients/api')
vi.mock('../doctors/api')

const admission: Admission = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  admissionNumber: 'ADM-550e8400-e29b-41d4-a716-446655440000',
  patientId: '11111111-1111-4111-8111-111111111111',
  attendingDoctorId: '44444444-4444-4444-8444-444444444444',
  admittedAt: '2030-06-01T10:00:00.000Z',
  dischargedAt: null,
  status: 'admitted',
  reason: 'Fictional observation',
  dischargeSummary: null,
  createdByUserId: 'user-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  patient: {
    id: '11111111-1111-4111-8111-111111111111',
    patientNumber: 'P-11111111-1111-4111-8111-111111111111',
    firstName: 'Fictional',
    lastName: 'Patient',
    status: 'active',
  },
  attendingDoctor: {
    id: '44444444-4444-4444-8444-444444444444',
    licenseNumber: 'LIC-100',
    specialization: 'General',
    status: 'active',
    employee: {
      id: '33333333-3333-4333-8333-333333333333',
      employeeNumber: 'E-33333333-3333-4333-8333-333333333333',
      firstName: 'Fictional',
      lastName: 'Physician',
      employmentStatus: 'active',
    },
  },
  createdBy: { id: 'user-1', username: 'receptionist' },
}

function createClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}

function authValue(permissions: string[]): AuthContextValue {
  return {
    user: {
      id: 'user-1',
      username: 'test-user',
      roles: ['receptionist'],
      permissions,
    },
    isBootstrapping: false,
    login: async () => undefined,
    logout: async () => undefined,
    changePassword: async () => undefined,
  }
}

function renderList(permissions: string[]) {
  return render(
    <QueryClientProvider client={createClient()}>
      <AuthContext value={authValue(permissions)}>
        <MemoryRouter>
          <AdmissionListPage />
        </MemoryRouter>
      </AuthContext>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(patientApi.fetchPatients).mockResolvedValue({
    data: [{
      id: admission.patient.id,
      patientNumber: admission.patient.patientNumber,
      firstName: admission.patient.firstName,
      lastName: admission.patient.lastName,
      dateOfBirth: null,
      dateOfBirthPrecision: 'unknown',
      sexAtRegistration: null,
      phone: null,
      email: null,
      addressText: null,
      emergencyContactName: null,
      emergencyContactPhone: null,
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }, {
      id: 'deaddead-dead-4ead-8ead-deaddeaddead',
      patientNumber: 'P-dead',
      firstName: 'Deceased',
      lastName: 'Patient',
      dateOfBirth: null,
      dateOfBirthPrecision: 'unknown',
      sexAtRegistration: null,
      phone: null,
      email: null,
      addressText: null,
      emergencyContactName: null,
      emergencyContactPhone: null,
      status: 'deceased',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }],
    pagination: { page: 1, pageSize: 100, totalItems: 2, totalPages: 1 },
  })
  vi.mocked(doctorApi.fetchDoctors).mockResolvedValue({
    data: [{
      id: admission.attendingDoctor!.id,
      employeeId: admission.attendingDoctor!.employee.id,
      employee: {
        id: admission.attendingDoctor!.employee.id,
        employeeNumber: admission.attendingDoctor!.employee.employeeNumber,
        userId: null,
        departmentId: '22222222-2222-4222-8222-222222222222',
        department: {
          id: '22222222-2222-4222-8222-222222222222',
          code: 'GEN',
          name: 'General',
          description: null,
          status: 'active',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        firstName: admission.attendingDoctor!.employee.firstName,
        lastName: admission.attendingDoctor!.employee.lastName,
        phone: null,
        email: null,
        jobTitle: 'Physician',
        employmentStatus: 'active',
        hireDate: '2022-01-01',
        endDate: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      licenseNumber: admission.attendingDoctor!.licenseNumber,
      specialization: admission.attendingDoctor!.specialization,
      professionalSummary: null,
      contactExtension: null,
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }],
    pagination: { page: 1, pageSize: 100, totalItems: 1, totalPages: 1 },
  })
})

describe('admission navigation', () => {
  it('shows Admissions for nurse and receptionist and hides it for other roles', () => {
    const { unmount } = render(
      <AuthContext value={authValue(['admission.read'])}>
        <MemoryRouter>
          <AppShell />
        </MemoryRouter>
      </AuthContext>,
    )
    expect(screen.getByRole('link', { name: 'Admissions' })).toBeVisible()
    unmount()

    render(
      <AuthContext value={authValue(['patient.read', 'invoice.read'])}>
        <MemoryRouter>
          <AppShell />
        </MemoryRouter>
      </AuthContext>,
    )
    expect(screen.queryByRole('link', { name: 'Admissions' })).toBeNull()
  })
})

describe('admission list', () => {
  it('shows admissions and hides create without admission.create', async () => {
    vi.mocked(admissionApi.fetchAdmissions).mockResolvedValue({
      data: [admission],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    })
    renderList(['admission.read'])
    expect(await screen.findByText(admission.admissionNumber)).toBeVisible()
    expect(screen.getByText(/Fictional Patient/)).toBeVisible()
    expect(screen.getByText('Fictional Physician')).toBeVisible()
    expect(screen.getAllByText('Admitted').length).toBeGreaterThan(0)
    expect(screen.queryByRole('link', { name: 'Register admission' })).toBeNull()
    expect(screen.getByRole('link', { name: 'View' })).toBeVisible()
  })

  it('shows the create action when admission.create is granted', async () => {
    vi.mocked(admissionApi.fetchAdmissions).mockResolvedValue({
      data: [admission],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    })
    renderList(['admission.read', 'admission.create'])
    expect(await screen.findByRole('link', { name: 'Register admission' })).toBeVisible()
  })

  it('shows loading, empty, and error states', async () => {
    vi.mocked(admissionApi.fetchAdmissions).mockRejectedValueOnce(
      new ApiError('Admissions could not be loaded.', 503),
    )
    const { unmount } = renderList(['admission.read'])
    expect(await screen.findByText('Admissions could not be loaded.')).toBeVisible()
    unmount()

    vi.mocked(admissionApi.fetchAdmissions).mockResolvedValueOnce({
      data: [],
      pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
    })
    renderList(['admission.read'])
    expect(await screen.findByRole('heading', { name: 'No admissions found' })).toBeVisible()
  })
})

describe('admission create form', () => {
  it('validates reason, excludes deceased patients, and submits allowed fields only', async () => {
    vi.mocked(admissionApi.createAdmission).mockResolvedValue(admission)
    render(
      <QueryClientProvider client={createClient()}>
        <NotificationProvider>
          <AuthContext value={authValue(['admission.create', 'patient.read', 'doctor.read'])}>
            <MemoryRouter>
              <AdmissionCreatePage />
            </MemoryRouter>
          </AuthContext>
        </NotificationProvider>
      </QueryClientProvider>,
    )
    fireEvent.mouseDown(await screen.findByRole('combobox', { name: /Patient/ }))
    expect(screen.queryByRole('option', { name: /Deceased Patient/ })).toBeNull()
    fireEvent.click(await screen.findByRole('option', { name: /Fictional Patient/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Register admission' }))
    expect(await screen.findByText('Admission reason is required.')).toBeVisible()
    expect(admissionApi.createAdmission).not.toHaveBeenCalled()

    fireEvent.change(screen.getByRole('textbox', { name: /Admission reason/ }), {
      target: { value: '  Observation  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Register admission' }))
    await waitFor(() =>
      expect(admissionApi.createAdmission).toHaveBeenCalledWith({
        patientId: admission.patientId,
        reason: 'Observation',
      }),
    )
    expect(admissionApi.createAdmission).not.toHaveBeenCalledWith(
      expect.objectContaining({ admissionNumber: expect.anything() }),
    )
  })

  it('shows API errors from failed creation', async () => {
    vi.mocked(admissionApi.createAdmission).mockRejectedValue(
      new ApiError('This patient already has an active admission.', 409),
    )
    render(
      <QueryClientProvider client={createClient()}>
        <NotificationProvider>
          <AuthContext value={authValue(['admission.create', 'patient.read', 'doctor.read'])}>
            <MemoryRouter>
              <AdmissionCreatePage />
            </MemoryRouter>
          </AuthContext>
        </NotificationProvider>
      </QueryClientProvider>,
    )
    fireEvent.mouseDown(await screen.findByRole('combobox', { name: /Patient/ }))
    fireEvent.click(await screen.findByRole('option', { name: /Fictional Patient/ }))
    fireEvent.change(screen.getByRole('textbox', { name: /Admission reason/ }), {
      target: { value: 'Observation' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Register admission' }))
    expect(
      await screen.findByText('This patient already has an active admission.'),
    ).toBeVisible()
  })
})

describe('admission detail', () => {
  it('renders admission fields and does not show unauthorized actions', async () => {
    vi.mocked(admissionApi.fetchAdmission).mockResolvedValue({
      ...admission,
      dischargeSummary: 'Recovered',
      dischargedAt: '2030-06-03T10:00:00.000Z',
      status: 'discharged',
    })
    render(
      <QueryClientProvider client={createClient()}>
        <AuthContext value={authValue(['admission.read'])}>
          <MemoryRouter initialEntries={[`/admissions/${admission.id}`]}>
            <Routes>
              <Route path="/admissions/:admissionId" element={<AdmissionDetailPage />} />
            </Routes>
          </MemoryRouter>
        </AuthContext>
      </QueryClientProvider>,
    )
    expect(await screen.findByRole('heading', { name: admission.admissionNumber })).toBeVisible()
    expect(screen.getByText(/Fictional Patient/)).toBeVisible()
    expect(screen.getByText('Fictional Physician')).toBeVisible()
    expect(screen.getByText('Discharged')).toBeVisible()
    expect(screen.getByText('Fictional observation')).toBeVisible()
    expect(screen.getByText('Recovered')).toBeVisible()
    expect(screen.queryByRole('button', { name: /discharge/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /cancel/i })).toBeNull()
    expect(screen.queryByRole('link', { name: /edit/i })).toBeNull()
  })
})

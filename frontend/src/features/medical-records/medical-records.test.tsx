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
import { NotificationProvider } from '../../shared/notifications/NotificationProvider'
import { PatientDetailPage } from '../patients/PatientDetailPage'
import * as patientApi from '../patients/api'
import * as prescriptionApi from '../prescriptions/api'
import * as medicalRecordApi from './api'
import { MedicalRecordCreatePage } from './MedicalRecordCreatePage'
import { MedicalRecordDetailPage } from './MedicalRecordDetailPage'
import { MedicalRecordListPage } from './MedicalRecordListPage'
import { useCreateMedicalRecord, useFinalizeMedicalRecord } from './hooks'
import type { MedicalRecord } from './types'

vi.mock('./api')
vi.mock('../patients/api')
vi.mock('../prescriptions/api')

const record: MedicalRecord = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  patientId: '11111111-1111-4111-8111-111111111111',
  authorEmployeeId: '33333333-3333-4333-8333-333333333333',
  appointmentId: null,
  admissionId: null,
  occurredAt: '2030-03-01T12:00:00.000Z',
  status: 'draft',
  finalizedAt: null,
  amendsMedicalRecordId: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  patient: {
    id: '11111111-1111-4111-8111-111111111111',
    patientNumber: 'P-11111111-1111-4111-8111-111111111111',
    firstName: 'Fictional',
    lastName: 'Patient',
    status: 'active',
  },
  author: {
    id: '33333333-3333-4333-8333-333333333333',
    employeeNumber: 'E-33333333-3333-4333-8333-333333333333',
    firstName: 'Fictional',
    lastName: 'Clinician',
    employmentStatus: 'active',
  },
  diagnoses: [{ id: 'd1', diagnosisText: 'Fictional fever', createdAt: '2026-01-01T00:00:00.000Z' }],
  treatments: [],
  reports: [],
  appointment: null,
  admission: null,
  amends: null,
  amendedBy: null,
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
      username: 'clinician',
      roles: ['doctor'],
      permissions,
    },
    isBootstrapping: false,
    login: async () => undefined,
    logout: async () => undefined,
    changePassword: async () => undefined,
  }
}

const doctorPermissions = [
  'medical_record.read',
  'medical_record.create',
  'medical_record.update',
  'medical_record.finalize',
  'medical_record.amend',
  'prescription.read',
  'prescription.create',
  'prescription.cancel',
  'medicine.read',
  'patient.read',
]

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(patientApi.fetchPatients).mockResolvedValue({
    data: [{
      id: record.patient.id,
      patientNumber: record.patient.patientNumber,
      firstName: record.patient.firstName,
      lastName: record.patient.lastName,
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
    }],
    pagination: { page: 1, pageSize: 100, totalItems: 1, totalPages: 1 },
  })
  vi.mocked(patientApi.fetchPatient).mockResolvedValue({
    id: record.patient.id,
    patientNumber: record.patient.patientNumber,
    firstName: record.patient.firstName,
    lastName: record.patient.lastName,
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
  })
  vi.mocked(prescriptionApi.fetchPrescriptions).mockResolvedValue({
    data: [],
    pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
  })
})

describe('medical record list', () => {
  it('shows records and hides create without permission', async () => {
    vi.mocked(medicalRecordApi.fetchMedicalRecords).mockResolvedValue({
      data: [record],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    })
    render(
      <QueryClientProvider client={createClient()}>
        <AuthContext value={authValue(['medical_record.read', 'patient.read'])}>
          <MemoryRouter>
            <MedicalRecordListPage />
          </MemoryRouter>
        </AuthContext>
      </QueryClientProvider>,
    )
    expect(await screen.findByText(/Fictional Patient/)).toBeVisible()
    expect(screen.queryByRole('link', { name: 'New medical record' })).toBeNull()
  })
})

describe('medical record create and detail', () => {
  it('creates a draft from the form', async () => {
    vi.mocked(medicalRecordApi.createMedicalRecord).mockResolvedValue(record)
    render(
      <QueryClientProvider client={createClient()}>
        <NotificationProvider>
          <AuthContext value={authValue(doctorPermissions)}>
            <MemoryRouter>
              <MedicalRecordCreatePage />
            </MemoryRouter>
          </AuthContext>
        </NotificationProvider>
      </QueryClientProvider>,
    )
    fireEvent.mouseDown(await screen.findByLabelText(/^Patient/))
    fireEvent.click(await screen.findByRole('option', { name: /Fictional Patient/ }))
    fireEvent.change(screen.getByLabelText(/^Diagnoses/), {
      target: { value: 'Fictional fever' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create draft' }))
    await waitFor(() => expect(medicalRecordApi.createMedicalRecord).toHaveBeenCalled())
  })

  it('finalizes a draft and hides write actions without permission', async () => {
    vi.mocked(medicalRecordApi.fetchMedicalRecord).mockResolvedValue(record)
    vi.mocked(medicalRecordApi.finalizeMedicalRecord).mockResolvedValue({
      ...record,
      status: 'final',
      finalizedAt: '2030-03-01T13:00:00.000Z',
    })
    const { unmount } = render(
      <QueryClientProvider client={createClient()}>
        <NotificationProvider>
          <AuthContext value={authValue(doctorPermissions)}>
            <MemoryRouter initialEntries={[`/medical-records/${record.id}`]}>
              <Routes>
                <Route path="/medical-records/:medicalRecordId" element={<MedicalRecordDetailPage />} />
              </Routes>
            </MemoryRouter>
          </AuthContext>
        </NotificationProvider>
      </QueryClientProvider>,
    )
    expect(await screen.findByText('Fictional fever')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Finalize record' }))
    fireEvent.click(screen.getByRole('button', { name: 'Finalize this record' }))
    await waitFor(() => expect(medicalRecordApi.finalizeMedicalRecord).toHaveBeenCalledWith(record.id))
    unmount()

    render(
      <QueryClientProvider client={createClient()}>
        <NotificationProvider>
          <AuthContext value={authValue(['medical_record.read'])}>
            <MemoryRouter initialEntries={[`/medical-records/${record.id}`]}>
              <Routes>
                <Route path="/medical-records/:medicalRecordId" element={<MedicalRecordDetailPage />} />
              </Routes>
            </MemoryRouter>
          </AuthContext>
        </NotificationProvider>
      </QueryClientProvider>,
    )
    expect(await screen.findByText('Fictional fever')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Finalize record' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Edit draft' })).toBeNull()
  })
})

describe('patient history permission boundary', () => {
  it('hides medical history without medical_record.read', async () => {
    render(
      <QueryClientProvider client={createClient()}>
        <AuthContext value={authValue(['patient.read'])}>
          <MemoryRouter initialEntries={[`/patients/${record.patientId}`]}>
            <Routes>
              <Route path="/patients/:patientId" element={<PatientDetailPage />} />
            </Routes>
          </MemoryRouter>
        </AuthContext>
      </QueryClientProvider>,
    )
    expect(await screen.findByText(record.patient.patientNumber)).toBeVisible()
    expect(
      screen.getByText(/Patient demographic permission is not sufficient/),
    ).toBeVisible()
    expect(medicalRecordApi.fetchMedicalRecords).not.toHaveBeenCalled()
  })

  it('loads medical history when medical_record.read is granted', async () => {
    vi.mocked(medicalRecordApi.fetchMedicalRecords).mockResolvedValue({
      data: [record],
      pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 },
    })
    render(
      <QueryClientProvider client={createClient()}>
        <AuthContext value={authValue(['patient.read', 'medical_record.read'])}>
          <MemoryRouter initialEntries={[`/patients/${record.patientId}`]}>
            <Routes>
              <Route path="/patients/:patientId" element={<PatientDetailPage />} />
            </Routes>
          </MemoryRouter>
        </AuthContext>
      </QueryClientProvider>,
    )
    expect(await screen.findByRole('heading', { name: 'Medical history' })).toBeVisible()
    expect(await screen.findByText('Draft')).toBeVisible()
  })
})

describe('medical record query invalidation', () => {
  it('writes the created record into the detail cache', async () => {
    vi.mocked(medicalRecordApi.createMedicalRecord).mockResolvedValue(record)
    const client = createClient()
    const { result } = renderHook(() => useCreateMedicalRecord(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    })
    await result.current.mutateAsync({
      patientId: record.patientId,
      occurredAt: record.occurredAt,
    })
    expect(client.getQueryData(['medical-records', 'detail', record.id])).toEqual(record)
  })

  it('updates detail cache after finalization', async () => {
    const finalized = { ...record, status: 'final' as const, finalizedAt: '2030-03-01T13:00:00.000Z' }
    vi.mocked(medicalRecordApi.finalizeMedicalRecord).mockResolvedValue(finalized)
    const client = createClient()
    const { result } = renderHook(() => useFinalizeMedicalRecord(record.id), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    })
    await result.current.mutateAsync()
    expect(client.getQueryData(['medical-records', 'detail', record.id])).toEqual(finalized)
  })
})

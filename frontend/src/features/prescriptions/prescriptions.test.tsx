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
import { ApiError } from '../../api/client'
import { AuthContext, type AuthContextValue } from '../../auth/authContext'
import { NotificationProvider } from '../../shared/notifications/NotificationProvider'
import * as prescriptionApi from './api'
import { PrescriptionCreatePage } from './PrescriptionCreatePage'
import { PrescriptionDetailPage } from './PrescriptionDetailPage'
import { PrescriptionListPage } from './PrescriptionListPage'
import { useCancelPrescription } from './hooks'
import type { Prescription } from './types'

vi.mock('./api')

const prescription: Prescription = {
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  medicalRecordId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  patientId: '11111111-1111-4111-8111-111111111111',
  prescribedByDoctorId: '44444444-4444-4444-8444-444444444444',
  prescribedAt: '2030-03-01T14:00:00.000Z',
  status: 'active',
  notes: null,
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
  prescribedBy: {
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
    medicineId: 'med-1',
    dosage: '1 tablet',
    route: 'oral',
    frequency: 'daily',
    duration: '3 days',
    instructions: null,
    quantityPrescribed: '3',
    quantityDispensed: '0',
    quantityRemaining: '3',
    unit: 'tablet',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    medicine: {
      id: 'med-1',
      code: 'MED-A',
      genericName: 'Fictionalcillin',
      brandName: null,
      dosageForm: 'tablet',
      strength: '500mg',
      inventoryUnit: 'tablet',
      status: 'active',
      currency: 'LKR',
    },
    dispenseRecords: [],
  }],
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

beforeEach(() => {
  vi.resetAllMocks()
})

describe('prescription list and detail', () => {
  it('lists prescriptions', async () => {
    vi.mocked(prescriptionApi.fetchPrescriptions).mockResolvedValue({
      data: [prescription],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    })
    render(
      <QueryClientProvider client={createClient()}>
        <AuthContext value={authValue(['prescription.read'])}>
          <MemoryRouter>
            <PrescriptionListPage />
          </MemoryRouter>
        </AuthContext>
      </QueryClientProvider>,
    )
    expect(await screen.findByText('Fictional Patient')).toBeVisible()
    expect(screen.getByText('active')).toBeVisible()
  })

  it('cancels an active prescription and hides cancel without permission', async () => {
    vi.mocked(prescriptionApi.fetchPrescription).mockResolvedValue(prescription)
    vi.mocked(prescriptionApi.cancelPrescription).mockResolvedValue({
      ...prescription,
      status: 'cancelled',
    })
    const { unmount } = render(
      <QueryClientProvider client={createClient()}>
        <NotificationProvider>
          <AuthContext value={authValue(['prescription.read', 'prescription.cancel'])}>
            <MemoryRouter initialEntries={[`/prescriptions/${prescription.id}`]}>
              <Routes>
                <Route path="/prescriptions/:prescriptionId" element={<PrescriptionDetailPage />} />
              </Routes>
            </MemoryRouter>
          </AuthContext>
        </NotificationProvider>
      </QueryClientProvider>,
    )
    expect(await screen.findByText(/Fictionalcillin/)).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel prescription' }))
    fireEvent.change(await screen.findByRole('textbox', { name: /Cancellation reason/ }), {
      target: { value: 'Entered in error' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Confirm cancellation' }))
    await waitFor(() =>
      expect(prescriptionApi.cancelPrescription).toHaveBeenCalledWith(
        prescription.id,
        'Entered in error',
      ),
    )
    unmount()

    render(
      <QueryClientProvider client={createClient()}>
        <NotificationProvider>
          <AuthContext value={authValue(['prescription.read'])}>
            <MemoryRouter initialEntries={[`/prescriptions/${prescription.id}`]}>
              <Routes>
                <Route path="/prescriptions/:prescriptionId" element={<PrescriptionDetailPage />} />
              </Routes>
            </MemoryRouter>
          </AuthContext>
        </NotificationProvider>
      </QueryClientProvider>,
    )
    expect(await screen.findByText(/Fictionalcillin/)).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Cancel prescription' })).toBeNull()
  })

  it('dispenses an explicit remaining quantity', async () => {
    vi.mocked(prescriptionApi.fetchPrescription).mockResolvedValue(prescription)
    vi.mocked(prescriptionApi.dispensePrescriptionItem).mockResolvedValue({
      ...prescription,
      status: 'partially_dispensed',
      items: [{
        ...prescription.items[0]!,
        quantityDispensed: '1',
        quantityRemaining: '2',
      }],
    })
    render(
      <QueryClientProvider client={createClient()}>
        <NotificationProvider>
          <AuthContext value={authValue(['prescription.read', 'prescription.dispense'])}>
            <MemoryRouter initialEntries={[`/prescriptions/${prescription.id}`]}>
              <Routes>
                <Route path="/prescriptions/:prescriptionId" element={<PrescriptionDetailPage />} />
              </Routes>
            </MemoryRouter>
          </AuthContext>
        </NotificationProvider>
      </QueryClientProvider>,
    )
    expect(await screen.findByText(/Remaining/)).toBeVisible()
    fireEvent.change(screen.getByLabelText(/Dispense quantity/), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Dispense' }))
    await waitFor(() =>
      expect(prescriptionApi.dispensePrescriptionItem).toHaveBeenCalledWith(
        prescription.id,
        'item-1',
        { quantity: '1', note: null },
      ),
    )
  })

  it('reverses a completed dispense with a required reason', async () => {
    const dispensed: Prescription = {
      ...prescription,
      status: 'partially_dispensed',
      items: [{
        ...prescription.items[0]!,
        quantityDispensed: '1',
        quantityRemaining: '2',
        dispenseRecords: [{
          id: 'dispense-1',
          quantityDispensed: '1',
          unit: 'tablet',
          dispensedAt: '2030-03-02T14:00:00.000Z',
          dispensedByEmployeeId: '33333333-3333-4333-8333-333333333333',
          status: 'completed',
          note: null,
          reversed: false,
          reversal: null,
          dispensedBy: {
            id: '33333333-3333-4333-8333-333333333333',
            employeeNumber: 'E-1',
            firstName: 'Fictional',
            lastName: 'Pharmacist',
            employmentStatus: 'active',
          },
        }],
      }],
    }
    vi.mocked(prescriptionApi.fetchPrescription).mockResolvedValue(dispensed)
    vi.mocked(prescriptionApi.reverseDispense).mockResolvedValue({
      ...prescription,
      status: 'active',
    })
    render(
      <QueryClientProvider client={createClient()}>
        <NotificationProvider>
          <AuthContext value={authValue(['prescription.read', 'prescription.reverse'])}>
            <MemoryRouter initialEntries={[`/prescriptions/${prescription.id}`]}>
              <Routes>
                <Route path="/prescriptions/:prescriptionId" element={<PrescriptionDetailPage />} />
              </Routes>
            </MemoryRouter>
          </AuthContext>
        </NotificationProvider>
      </QueryClientProvider>,
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Reverse dispense' }))
    fireEvent.change(screen.getByLabelText('Reversal reason'), {
      target: { value: 'Incorrect quantity' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Confirm reversal' }))
    await waitFor(() =>
      expect(prescriptionApi.reverseDispense).toHaveBeenCalledWith(
        prescription.id,
        'dispense-1',
        'Incorrect quantity',
      ),
    )
  })

  it('shows a domain error when remaining quantity is exceeded', async () => {
    vi.mocked(prescriptionApi.fetchPrescription).mockResolvedValue(prescription)
    vi.mocked(prescriptionApi.dispensePrescriptionItem).mockRejectedValue(
      new ApiError('Requested quantity exceeds remaining prescribed quantity.', 409),
    )
    render(
      <QueryClientProvider client={createClient()}>
        <NotificationProvider>
          <AuthContext value={authValue(['prescription.read', 'prescription.dispense'])}>
            <MemoryRouter initialEntries={[`/prescriptions/${prescription.id}`]}>
              <Routes>
                <Route path="/prescriptions/:prescriptionId" element={<PrescriptionDetailPage />} />
              </Routes>
            </MemoryRouter>
          </AuthContext>
        </NotificationProvider>
      </QueryClientProvider>,
    )
    fireEvent.change(await screen.findByLabelText(/Dispense quantity/), { target: { value: '20' } })
    fireEvent.click(screen.getByRole('button', { name: 'Dispense' }))
    expect(await screen.findByText(/exceeds remaining prescribed quantity/)).toBeVisible()
  })
})

describe('prescription creation medicine lookup', () => {
  it('submits the canonical medicine unit', async () => {
    vi.mocked(prescriptionApi.fetchMedicines).mockResolvedValue({
      data: [prescription.items[0]!.medicine],
      pagination: { page: 1, pageSize: 100, totalItems: 1, totalPages: 1 },
    })
    vi.mocked(prescriptionApi.createPrescription).mockResolvedValue(prescription)
    render(
      <QueryClientProvider client={createClient()}>
        <NotificationProvider>
          <AuthContext value={authValue(['prescription.create', 'medicine.read'])}>
            <MemoryRouter initialEntries={['/medical-records/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/prescriptions/new']}>
              <Routes>
                <Route
                  path="/medical-records/:medicalRecordId/prescriptions/new"
                  element={<PrescriptionCreatePage />}
                />
              </Routes>
            </MemoryRouter>
          </AuthContext>
        </NotificationProvider>
      </QueryClientProvider>,
    )
    fireEvent.mouseDown(await screen.findByLabelText(/Medicine/))
    fireEvent.click(await screen.findByRole('option', { name: /Fictionalcillin/ }))
    fireEvent.change(screen.getByLabelText(/^Dosage/), { target: { value: '1 tablet' } })
    fireEvent.change(screen.getByLabelText(/^Frequency/), { target: { value: 'daily' } })
    fireEvent.change(screen.getByLabelText(/^Duration/), { target: { value: '3 days' } })
    fireEvent.change(screen.getByLabelText(/^Quantity prescribed/), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create prescription' }))
    await waitFor(() =>
      expect(prescriptionApi.createPrescription).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [
            expect.objectContaining({
              medicineId: 'med-1',
              unit: 'tablet',
              quantityPrescribed: '3',
            }),
          ],
        }),
      ),
    )
  })
})

describe('prescription query invalidation', () => {
  it('updates detail cache after cancellation', async () => {
    const cancelled = { ...prescription, status: 'cancelled' as const }
    vi.mocked(prescriptionApi.cancelPrescription).mockResolvedValue(cancelled)
    const client = createClient()
    const { result } = renderHook(() => useCancelPrescription(prescription.id), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    })
    await result.current.mutateAsync('Entered in error')
    expect(client.getQueryData(['prescriptions', 'detail', prescription.id])).toEqual(cancelled)
  })
})

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
import * as medicineApi from './api'
import { MedicineCreatePage } from './MedicineCreatePage'
import { MedicineListPage } from './MedicineListPage'
import { useUpdateMedicine } from './hooks'
import type { Medicine } from './types'

vi.mock('./api')

const medicine: Medicine = {
  id: '33333333-3333-4333-8333-333333333333',
  code: 'PARA500',
  genericName: 'Paracetamol',
  brandName: 'Fictional Panadol',
  dosageForm: 'tablet',
  strength: '500 mg',
  inventoryUnit: 'tablet',
  defaultSalePrice: '12.5',
  currency: 'LKR',
  lowStockThreshold: '20',
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
  permissions = ['medicine.read', 'medicine.create', 'medicine.update'],
) {
  const auth: AuthContextValue = {
    user: {
      id: 'user-1',
      username: 'administrator',
      roles: ['administrator'],
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
          <MedicineListPage />
        </MemoryRouter>
      </AuthContext>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('medicine catalogue list', () => {
  it('shows loading and successful medicine data', async () => {
    let resolve!: (value: Awaited<ReturnType<typeof medicineApi.fetchMedicines>>) => void
    vi.mocked(medicineApi.fetchMedicines).mockReturnValue(
      new Promise((done) => { resolve = done }),
    )
    renderList()
    expect(screen.getByRole('status')).toHaveTextContent('Loading medicines')

    resolve({
      data: [medicine],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    })
    expect(await screen.findByText(medicine.code)).toBeVisible()
    expect(screen.getByText('Paracetamol')).toBeVisible()
  })

  it('shows request errors and empty results', async () => {
    vi.mocked(medicineApi.fetchMedicines).mockRejectedValueOnce(
      new ApiError('Medicine service unavailable.', 503),
    )
    const { unmount } = renderList()
    expect(await screen.findByText('Medicine service unavailable.')).toBeVisible()
    unmount()

    vi.mocked(medicineApi.fetchMedicines).mockResolvedValueOnce({
      data: [],
      pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
    })
    renderList()
    expect(await screen.findByRole('heading', { name: 'No medicines found' })).toBeVisible()
  })

  it('submits search and status filters', async () => {
    vi.mocked(medicineApi.fetchMedicines).mockResolvedValue({
      data: [medicine],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    })
    renderList()
    expect(await screen.findByText(medicine.code)).toBeVisible()
    fireEvent.change(screen.getByLabelText(/Search by code/), {
      target: { value: 'PARA' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    await waitFor(() =>
      expect(medicineApi.fetchMedicines).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'PARA', page: 1 }),
      ),
    )
    fireEvent.mouseDown(screen.getByLabelText('Status'))
    fireEvent.click(await screen.findByRole('option', { name: 'active' }))
    await waitFor(() =>
      expect(medicineApi.fetchMedicines).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'active' }),
      ),
    )
  })

  it('hides create when the user cannot create medicines', async () => {
    vi.mocked(medicineApi.fetchMedicines).mockResolvedValue({
      data: [medicine],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    })
    renderList(createClient(), ['medicine.read'])
    expect(await screen.findByText(medicine.code)).toBeVisible()
    expect(screen.queryByRole('link', { name: 'Create medicine' })).toBeNull()
  })
})

describe('medicine create and query invalidation', () => {
  it('creates a medicine and navigates to details', async () => {
    vi.mocked(medicineApi.createMedicine).mockResolvedValue(medicine)
    render(
      <QueryClientProvider client={createClient()}>
        <NotificationProvider>
          <MemoryRouter initialEntries={['/medicines/new']}>
            <Routes>
              <Route path="/medicines/new" element={<MedicineCreatePage />} />
              <Route path="/medicines/:medicineId" element={<div>Medicine details destination</div>} />
            </Routes>
          </MemoryRouter>
        </NotificationProvider>
      </QueryClientProvider>,
    )
    fireEvent.change(screen.getByLabelText(/^Code/), { target: { value: 'PARA500' } })
    fireEvent.change(screen.getByLabelText(/^Generic name/), { target: { value: 'Paracetamol' } })
    fireEvent.change(screen.getByLabelText(/^Dosage form/), { target: { value: 'tablet' } })
    fireEvent.change(screen.getByLabelText(/^Inventory unit/), { target: { value: 'tablet' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create medicine' }))
    expect(await screen.findByText('Medicine details destination')).toBeVisible()
    expect(medicineApi.createMedicine).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'PARA500',
        genericName: 'Paracetamol',
        dosageForm: 'tablet',
        inventoryUnit: 'tablet',
        currency: 'LKR',
      }),
    )
  })

  it('invalidates detail and list queries after an update', async () => {
    vi.mocked(medicineApi.updateMedicine).mockResolvedValue({
      ...medicine,
      genericName: 'Paracetamol updated',
    })
    const client = createClient()
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(() => useUpdateMedicine(medicine.id), { wrapper })
    await result.current.mutateAsync({ genericName: 'Paracetamol updated' })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['medicines', 'list'] })
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['medicines', 'detail', medicine.id],
    })
  })
})

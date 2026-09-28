import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../api/client'
import { AuthContext, type AuthContextValue } from '../../auth/authContext'
import { AppShell } from '../../app/AppShell'
import { NotificationProvider } from '../../shared/notifications/NotificationProvider'
import * as medicineApi from '../prescriptions/api'
import * as pharmacyApi from './api'
import { InventoryListPage } from './InventoryListPage'
import { StockAdjustPage } from './StockAdjustPage'
import { StockMovementListPage } from './StockMovementListPage'
import { StockReceivePage } from './StockReceivePage'
import type { InventoryBatch, StockMovement } from './types'

vi.mock('./api')
vi.mock('../prescriptions/api')

const batch: InventoryBatch = {
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  medicineId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  batchNumber: 'B-100',
  expiryDate: '2031-12-01',
  receivedQuantity: '20',
  availableQuantity: '18',
  status: 'active',
  receivedAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  medicine: {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    code: 'MED-A',
    genericName: 'Fictionalcillin',
    brandName: null,
    dosageForm: 'tablet',
    strength: '500mg',
    inventoryUnit: 'tablet',
    status: 'active',
    currency: 'LKR',
  },
}

const movement: StockMovement = {
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  medicineBatchId: batch.id,
  movementType: 'receipt',
  quantity: '20',
  occurredAt: '2026-01-01T00:00:00.000Z',
  reason: 'Stock receipt',
  referenceIdentifier: null,
  dispenseRecordId: null,
  dispenseReversalId: null,
  medicineBatch: {
    id: batch.id,
    batchNumber: batch.batchNumber,
    expiryDate: batch.expiryDate,
    status: batch.status,
    medicine: batch.medicine,
  },
  performedBy: { id: 'user-1', username: 'pharmacist' },
}

function createClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}

function authValue(permissions: string[], roles = ['pharmacist']): AuthContextValue {
  return {
    user: {
      id: 'user-1',
      username: 'pharmacist',
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

describe('pharmacy navigation', () => {
  it('shows Inventory and Movements for pharmacist and administrator', () => {
    for (const [role, permissions] of [
      ['pharmacist', ['inventory.read', 'stock.movement.read']],
      ['administrator', ['inventory.read', 'stock.movement.read']],
    ] as const) {
      const { unmount } = render(
        <MemoryRouter>
          <AuthContext value={authValue([...permissions], [role])}>
            <AppShell />
          </AuthContext>
        </MemoryRouter>,
      )
      expect(screen.getByRole('link', { name: 'Inventory' })).toBeVisible()
      expect(screen.getByRole('link', { name: 'Movements' })).toBeVisible()
      unmount()
    }
  })

  it('hides pharmacy inventory navigation from other roles', () => {
    for (const role of ['doctor', 'nurse', 'receptionist', 'laboratory_staff', 'accountant']) {
      const { unmount } = render(
        <MemoryRouter>
          <AuthContext value={authValue([], [role])}>
            <AppShell />
          </AuthContext>
        </MemoryRouter>,
      )
      expect(screen.queryByRole('link', { name: 'Inventory' })).toBeNull()
      expect(screen.queryByRole('link', { name: 'Movements' })).toBeNull()
      unmount()
    }
  })
})

describe('inventory screens', () => {
  it('lists batches and shows receive/adjust actions by permission', async () => {
    vi.mocked(pharmacyApi.fetchInventory).mockResolvedValue({
      data: [batch],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    })
    const { unmount } = render(
      <QueryClientProvider client={createClient()}>
        <AuthContext value={authValue(['inventory.read', 'stock.receive', 'stock.adjust'])}>
          <MemoryRouter>
            <InventoryListPage />
          </MemoryRouter>
        </AuthContext>
      </QueryClientProvider>,
    )
    expect(await screen.findByText(/Fictionalcillin/)).toBeVisible()
    expect(screen.getByText('B-100')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Receive stock' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Adjust stock' })).toBeVisible()
    unmount()

    render(
      <QueryClientProvider client={createClient()}>
        <AuthContext value={authValue(['inventory.read'])}>
          <MemoryRouter>
            <InventoryListPage />
          </MemoryRouter>
        </AuthContext>
      </QueryClientProvider>,
    )
    expect(await screen.findByText(/Fictionalcillin/)).toBeVisible()
    expect(screen.queryByRole('link', { name: 'Receive stock' })).toBeNull()
  })

  it('submits a stock receipt', async () => {
    vi.mocked(medicineApi.fetchMedicines).mockResolvedValue({
      data: [batch.medicine],
      pagination: { page: 1, pageSize: 100, totalItems: 1, totalPages: 1 },
    })
    vi.mocked(pharmacyApi.receiveStock).mockResolvedValue({
      batch,
      movementId: movement.id,
    })
    render(
      <QueryClientProvider client={createClient()}>
        <NotificationProvider>
          <AuthContext value={authValue(['stock.receive', 'medicine.read'])}>
            <MemoryRouter>
              <StockReceivePage />
            </MemoryRouter>
          </AuthContext>
        </NotificationProvider>
      </QueryClientProvider>,
    )
    fireEvent.mouseDown(await screen.findByLabelText(/^Medicine/))
    fireEvent.click(await screen.findByRole('option', { name: /Fictionalcillin/ }))
    fireEvent.change(screen.getByLabelText('Batch number'), { target: { value: 'B-100' } })
    fireEvent.change(screen.getByLabelText('Expiry date'), { target: { value: '2031-12-01' } })
    fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '20' } })
    fireEvent.change(screen.getByLabelText('Currency'), { target: { value: 'LKR' } })
    fireEvent.change(screen.getByLabelText('Unit cost'), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText('Sale price snapshot'), { target: { value: '12' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirm receipt' }))
    await waitFor(() =>
      expect(pharmacyApi.receiveStock).toHaveBeenCalledWith({
        medicineId: batch.medicine.id,
        batchNumber: 'B-100',
        expiryDate: '2031-12-01',
        quantity: '20',
        unitCost: '5',
        salePriceSnapshot: '12',
        currency: 'LKR',
      }),
    )
  })

  it('submits a stock adjustment', async () => {
    vi.mocked(pharmacyApi.fetchInventory).mockResolvedValue({
      data: [batch],
      pagination: { page: 1, pageSize: 100, totalItems: 1, totalPages: 1 },
    })
    vi.mocked(pharmacyApi.adjustStock).mockResolvedValue(movement)
    render(
      <QueryClientProvider client={createClient()}>
        <NotificationProvider>
          <AuthContext value={authValue(['stock.adjust', 'inventory.read'])}>
            <MemoryRouter>
              <StockAdjustPage />
            </MemoryRouter>
          </AuthContext>
        </NotificationProvider>
      </QueryClientProvider>,
    )
    fireEvent.mouseDown(await screen.findByLabelText(/^Batch/))
    fireEvent.click(await screen.findByRole('option', { name: /B-100/ }))
    fireEvent.change(screen.getByLabelText('Adjustment quantity'), { target: { value: '-2' } })
    fireEvent.change(screen.getByLabelText('Adjustment reason'), {
      target: { value: 'Count correction' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Confirm adjustment' }))
    await waitFor(() =>
      expect(pharmacyApi.adjustStock).toHaveBeenCalledWith({
        medicineBatchId: batch.id,
        quantity: '-2',
        reason: 'Count correction',
      }),
    )
  })

  it('lists immutable stock movements', async () => {
    vi.mocked(pharmacyApi.fetchStockMovements).mockResolvedValue({
      data: [movement],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    })
    render(
      <QueryClientProvider client={createClient()}>
        <AuthContext value={authValue(['stock.movement.read'])}>
          <MemoryRouter>
            <StockMovementListPage />
          </MemoryRouter>
        </AuthContext>
      </QueryClientProvider>,
    )
    expect(await screen.findByText('receipt')).toBeVisible()
    expect(screen.getByText('pharmacist')).toBeVisible()
    expect(screen.queryByRole('button', { name: /delete/i })).toBeNull()
  })

  it('shows a domain error when receiving inactive or duplicate stock', async () => {
    vi.mocked(medicineApi.fetchMedicines).mockResolvedValue({
      data: [batch.medicine],
      pagination: { page: 1, pageSize: 100, totalItems: 1, totalPages: 1 },
    })
    vi.mocked(pharmacyApi.receiveStock).mockRejectedValue(
      new ApiError('A batch with this number already exists for the medicine.', 409),
    )
    render(
      <QueryClientProvider client={createClient()}>
        <NotificationProvider>
          <AuthContext value={authValue(['stock.receive', 'medicine.read'])}>
            <MemoryRouter>
              <StockReceivePage />
            </MemoryRouter>
          </AuthContext>
        </NotificationProvider>
      </QueryClientProvider>,
    )
    fireEvent.mouseDown(await screen.findByLabelText(/^Medicine/))
    fireEvent.click(await screen.findByRole('option', { name: /Fictionalcillin/ }))
    fireEvent.change(screen.getByLabelText('Batch number'), { target: { value: 'B-100' } })
    fireEvent.change(screen.getByLabelText('Expiry date'), { target: { value: '2031-12-01' } })
    fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '20' } })
    fireEvent.change(screen.getByLabelText('Currency'), { target: { value: 'LKR' } })
    fireEvent.change(screen.getByLabelText('Unit cost'), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText('Sale price snapshot'), { target: { value: '12' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirm receipt' }))
    expect(
      await screen.findByText(/batch with this number already exists/i),
    ).toBeVisible()
  })
})

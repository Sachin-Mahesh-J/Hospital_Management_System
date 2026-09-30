import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../../auth/authContext'
import { NotificationProvider } from '../../shared/notifications/NotificationProvider'
import * as leaveApi from './api'
import { LeaveListPage } from './LeaveListPage'
import type { LeaveRecord } from './types'

vi.mock('./api')

const leave: LeaveRecord = {
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  employeeId: '33333333-3333-4333-8333-333333333333',
  startsOn: '2026-11-01',
  endsOn: '2026-11-03',
  leaveType: 'sick',
  reason: null,
  status: 'pending',
  decidedByUserId: null,
  decidedAt: null,
  decisionNote: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  employee: {
    id: '33333333-3333-4333-8333-333333333333',
    employeeNumber: 'E-1',
    firstName: 'Fictional',
    lastName: 'Physician',
    employmentStatus: 'active',
  },
  decidedBy: null,
}

function createClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}

function renderPage(permissions: string[]) {
  const auth: AuthContextValue = {
    user: { id: 'user-1', username: 'staff', roles: ['doctor'], permissions },
    isBootstrapping: false,
    login: async () => undefined,
    logout: async () => undefined,
    changePassword: async () => undefined,
  }
  return render(
    <QueryClientProvider client={createClient()}>
      <NotificationProvider>
        <AuthContext value={auth}>
          <MemoryRouter>
            <LeaveListPage />
          </MemoryRouter>
        </AuthContext>
      </NotificationProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(leaveApi.fetchLeave).mockResolvedValue({
    data: [leave],
    pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
  })
})

describe('LeaveListPage', () => {
  it('lets an employee request leave and hides approval without leave.approve', async () => {
    renderPage(['leave.read', 'leave.create', 'leave.update', 'leave.cancel'])
    expect(await screen.findByText('Fictional Physician')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Request leave' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Edit' })).toBeVisible()
  })

  it('shows approve and reject for administrators', async () => {
    renderPage(['leave.read', 'leave.approve'])
    expect(await screen.findByRole('button', { name: 'Approve' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Reject' })).toBeVisible()
  })

  it('opens the request form', async () => {
    renderPage(['leave.read', 'leave.create'])
    fireEvent.click(await screen.findByRole('button', { name: 'Request leave' }))
    expect(screen.getByRole('heading', { name: 'Request leave' })).toBeVisible()
  })
})

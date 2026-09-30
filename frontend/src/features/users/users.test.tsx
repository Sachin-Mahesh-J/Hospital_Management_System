import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../../auth/authContext'
import { NotificationProvider } from '../../shared/notifications/NotificationProvider'
import * as employeeApi from '../employees/api'
import * as userApi from './api'
import { UserListPage } from './UserListPage'
import type { ManagedUser } from './types'

vi.mock('./api')
vi.mock('../employees/api')

const user: ManagedUser = {
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  username: 'fictional.nurse',
  status: 'active',
  lastLoginAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  role: { id: 'role-1', code: 'nurse', name: 'Nurse' },
  employee: null,
}

function createClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}

function renderPage(permissions: string[]) {
  const auth: AuthContextValue = {
    user: { id: 'user-1', username: 'administrator', roles: ['administrator'], permissions },
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
            <UserListPage />
          </MemoryRouter>
        </AuthContext>
      </NotificationProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(userApi.fetchUsers).mockResolvedValue({
    data: [user],
    pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
  })
  vi.mocked(employeeApi.fetchEmployees).mockResolvedValue({
    data: [],
    pagination: { page: 1, pageSize: 100, totalItems: 0, totalPages: 0 },
  })
})

describe('UserListPage', () => {
  it('lists users and hides administration without write permissions', async () => {
    renderPage(['user.read'])
    expect(await screen.findByText('fictional.nurse')).toBeVisible()
    expect(screen.getByText('Unlinked')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Create user' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Reset password' })).toBeNull()
  })

  it('opens create and reset dialogs when permitted', async () => {
    renderPage([
      'user.read',
      'user.create',
      'user.update',
      'user.deactivate',
      'user.role.update',
      'user.password.reset',
    ])
    expect(await screen.findByText('fictional.nurse')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Create user' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }))
    expect(await screen.findByRole('heading', { name: 'Reset password' })).toBeVisible()
    expect(screen.getByText(/will not be shown after save/i)).toBeVisible()
  })
})

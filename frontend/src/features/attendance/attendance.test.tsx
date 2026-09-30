import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../../auth/authContext'
import { NotificationProvider } from '../../shared/notifications/NotificationProvider'
import * as employeeApi from '../employees/api'
import * as attendanceApi from './api'
import { AttendanceListPage } from './AttendanceListPage'
import type { Attendance } from './types'

vi.mock('./api')
vi.mock('../employees/api')

const attendance: Attendance = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  employeeId: '33333333-3333-4333-8333-333333333333',
  workDate: '2026-01-15',
  checkInAt: '2026-01-15T03:30:00.000Z',
  checkOutAt: '2026-01-15T12:00:00.000Z',
  status: 'present',
  note: null,
  recordedByUserId: 'user-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  employee: {
    id: '33333333-3333-4333-8333-333333333333',
    employeeNumber: 'E-1',
    firstName: 'Fictional',
    lastName: 'Staffmember',
    employmentStatus: 'active',
  },
}

function createClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}

function renderPage(permissions = ['attendance.read', 'attendance.create', 'attendance.update', 'employee.read']) {
  const auth: AuthContextValue = {
    user: { id: 'user-1', username: 'receptionist', roles: ['receptionist'], permissions },
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
            <AttendanceListPage />
          </MemoryRouter>
        </AuthContext>
      </NotificationProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(attendanceApi.fetchAttendance).mockResolvedValue({
    data: [attendance],
    pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
  })
  vi.mocked(employeeApi.fetchEmployees).mockResolvedValue({
    data: [],
    pagination: { page: 1, pageSize: 100, totalItems: 0, totalPages: 0 },
  })
})

describe('AttendanceListPage', () => {
  it('lists attendance and hides write controls without permission', async () => {
    renderPage(['attendance.read'])
    expect(await screen.findByText('Fictional Staffmember')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Record attendance' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull()
  })

  it('shows create when permitted', async () => {
    renderPage()
    expect(await screen.findByRole('button', { name: 'Record attendance' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Record attendance' }))
    expect(screen.getByRole('heading', { name: 'Record attendance' })).toBeVisible()
  })

  it('shows empty state', async () => {
    vi.mocked(attendanceApi.fetchAttendance).mockResolvedValue({
      data: [],
      pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
    })
    renderPage()
    expect(await screen.findByRole('heading', { name: 'No attendance records' })).toBeVisible()
  })

  it('shows a retryable error', async () => {
    vi.mocked(attendanceApi.fetchAttendance).mockRejectedValue(new Error('failed'))
    renderPage()
    expect(await screen.findByText('Attendance could not be loaded.')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(attendanceApi.fetchAttendance).toHaveBeenCalledTimes(2))
  })
})

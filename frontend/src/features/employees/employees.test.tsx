import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../api/client'
import { AuthContext, type AuthContextValue } from '../../auth/authContext'
import { NotificationProvider } from '../../shared/notifications/NotificationProvider'
import * as departmentApi from '../departments/api'
import * as employeeApi from './api'
import { EmployeeListPage } from './EmployeeListPage'
import { EmployeeRegisterPage } from './EmployeeRegisterPage'
import type { Employee } from './types'

vi.mock('./api')
vi.mock('../departments/api')

const employee: Employee = {
  id: '33333333-3333-4333-8333-333333333333',
  employeeNumber: 'E-33333333-3333-4333-8333-333333333333',
  userId: null,
  departmentId: '22222222-2222-4222-8222-222222222222',
  department: {
    id: '22222222-2222-4222-8222-222222222222',
    code: 'CARD',
    name: 'Cardiology',
    description: null,
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  firstName: 'Fictional',
  lastName: 'Staffmember',
  phone: '555-0201',
  email: 'staff@example.test',
  jobTitle: 'Nurse',
  employmentStatus: 'active',
  hireDate: '2024-01-15',
  endDate: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function createClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}

function renderWithAuth(
  ui: ReactElement,
  permissions = ['employee.read', 'employee.create', 'employee.update', 'department.read'],
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
    <QueryClientProvider client={createClient()}>
      <NotificationProvider>
        <AuthContext value={auth}>
          <MemoryRouter>{ui}</MemoryRouter>
        </AuthContext>
      </NotificationProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(departmentApi.fetchDepartments).mockResolvedValue({
    data: [employee.department],
    pagination: { page: 1, pageSize: 100, totalItems: 1, totalPages: 1 },
  })
})

describe('employee list', () => {
  it('shows loading, success, empty, and error states', async () => {
    vi.mocked(employeeApi.fetchEmployees).mockRejectedValueOnce(
      new ApiError('Employee service unavailable.', 503),
    )
    const { unmount } = renderWithAuth(<EmployeeListPage />)
    expect(await screen.findByText('Employee service unavailable.')).toBeVisible()
    unmount()

    vi.mocked(employeeApi.fetchEmployees).mockResolvedValueOnce({
      data: [],
      pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
    })
    const empty = renderWithAuth(<EmployeeListPage />)
    expect(await screen.findByRole('heading', { name: 'No employees found' })).toBeVisible()
    empty.unmount()

    vi.mocked(employeeApi.fetchEmployees).mockResolvedValue({
      data: [employee],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    })
    renderWithAuth(<EmployeeListPage />, ['employee.read'])
    expect(await screen.findByText(employee.employeeNumber)).toBeVisible()
    expect(screen.queryByRole('link', { name: 'Register employee' })).toBeNull()
  })

  it('searches and filters employees', async () => {
    vi.mocked(employeeApi.fetchEmployees).mockResolvedValue({
      data: [employee],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    })
    renderWithAuth(<EmployeeListPage />)
    expect(await screen.findByText(employee.employeeNumber)).toBeVisible()
    fireEvent.change(screen.getByLabelText(/Search by number/), {
      target: { value: 'Staffmember' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    await waitFor(() =>
      expect(employeeApi.fetchEmployees).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'Staffmember', page: 1 }),
      ),
    )
    fireEvent.mouseDown(screen.getByLabelText('Status'))
    fireEvent.click(await screen.findByRole('option', { name: 'active' }))
    await waitFor(() =>
      expect(employeeApi.fetchEmployees).toHaveBeenLastCalledWith(
        expect.objectContaining({ employmentStatus: 'active' }),
      ),
    )
  })
})

describe('employee registration validation', () => {
  it('rejects an end date earlier than hire date', async () => {
    renderWithAuth(<EmployeeRegisterPage />)
    await screen.findByLabelText(/Department/)
    fireEvent.change(screen.getByLabelText(/First name/), { target: { value: 'Fictional' } })
    fireEvent.change(screen.getByLabelText(/Last name/), { target: { value: 'Staff' } })
    fireEvent.change(screen.getByLabelText(/Job title/), { target: { value: 'Nurse' } })
    fireEvent.mouseDown(screen.getByLabelText(/Department/))
    fireEvent.click(await screen.findByRole('option', { name: 'Cardiology' }))
    fireEvent.change(screen.getByLabelText(/Hire date/), { target: { value: '2024-05-01' } })
    fireEvent.change(screen.getByLabelText(/End date/), { target: { value: '2023-01-01' } })
    fireEvent.click(screen.getByRole('button', { name: 'Register employee' }))
    expect(await screen.findByText('End date cannot be earlier than hire date.')).toBeVisible()
    expect(employeeApi.createEmployee).not.toHaveBeenCalled()
  })
})

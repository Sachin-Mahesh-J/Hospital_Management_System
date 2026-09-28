import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../api/client'
import { AuthContext, type AuthContextValue } from '../../auth/authContext'
import { NotificationProvider } from '../../shared/notifications/NotificationProvider'
import * as departmentApi from '../departments/api'
import * as employeeApi from '../employees/api'
import * as doctorApi from './api'
import { DoctorCreatePage } from './DoctorCreatePage'
import { DoctorListPage } from './DoctorListPage'
import type { Doctor } from './types'

vi.mock('./api')
vi.mock('../departments/api')
vi.mock('../employees/api')

const doctor: Doctor = {
  id: '44444444-4444-4444-8444-444444444444',
  employeeId: '33333333-3333-4333-8333-333333333333',
  employee: {
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
    lastName: 'Physician',
    phone: null,
    email: null,
    jobTitle: 'Physician',
    employmentStatus: 'active',
    hireDate: '2022-01-01',
    endDate: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  licenseNumber: 'LIC-100',
  specialization: 'Cardiology',
  professionalSummary: null,
  contactExtension: null,
  status: 'active',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function createClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}

function renderList(permissions = ['doctor.read', 'doctor.create', 'department.read']) {
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
      <AuthContext value={auth}>
        <MemoryRouter>
          <DoctorListPage />
        </MemoryRouter>
      </AuthContext>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(departmentApi.fetchDepartments).mockResolvedValue({
    data: [doctor.employee.department],
    pagination: { page: 1, pageSize: 100, totalItems: 1, totalPages: 1 },
  })
})

describe('doctor list', () => {
  it('shows loading, success, empty, and error states', async () => {
    vi.mocked(doctorApi.fetchDoctors).mockRejectedValueOnce(
      new ApiError('Doctor service unavailable.', 503),
    )
    const { unmount } = renderList()
    expect(await screen.findByText('Doctor service unavailable.')).toBeVisible()
    unmount()

    vi.mocked(doctorApi.fetchDoctors).mockResolvedValueOnce({
      data: [],
      pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
    })
    const empty = renderList()
    expect(await screen.findByRole('heading', { name: 'No doctors found' })).toBeVisible()
    empty.unmount()

    vi.mocked(doctorApi.fetchDoctors).mockResolvedValue({
      data: [doctor],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    })
    renderList(['doctor.read'])
    expect(await screen.findByText('LIC-100')).toBeVisible()
    expect(screen.getByText('Fictional Physician')).toBeVisible()
    expect(screen.queryByRole('link', { name: 'Create doctor profile' })).toBeNull()
  })

  it('searches doctors', async () => {
    vi.mocked(doctorApi.fetchDoctors).mockResolvedValue({
      data: [doctor],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    })
    renderList()
    expect(await screen.findByText('LIC-100')).toBeVisible()
    fireEvent.change(screen.getByLabelText(/Search by name/), {
      target: { value: 'Physician' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    await waitFor(() =>
      expect(doctorApi.fetchDoctors).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'Physician' }),
      ),
    )
  })
})

describe('doctor profile creation', () => {
  it('links an existing employee rather than creating a person', async () => {
    vi.mocked(employeeApi.fetchEmployees).mockResolvedValue({
      data: [doctor.employee],
      pagination: { page: 1, pageSize: 100, totalItems: 1, totalPages: 1 },
    })
    vi.mocked(doctorApi.createDoctor).mockResolvedValue(doctor)
    const auth: AuthContextValue = {
      user: {
        id: 'user-1',
        username: 'administrator',
        roles: ['administrator'],
        permissions: ['doctor.create', 'employee.read'],
      },
      isBootstrapping: false,
      login: async () => undefined,
      logout: async () => undefined,
      changePassword: async () => undefined,
    }
    render(
      <QueryClientProvider client={createClient()}>
        <NotificationProvider>
          <AuthContext value={auth}>
            <MemoryRouter initialEntries={['/doctors/new']}>
              <Routes>
                <Route path="/doctors/new" element={<DoctorCreatePage />} />
                <Route path="/doctors/:doctorId" element={<div>Doctor details destination</div>} />
              </Routes>
            </MemoryRouter>
          </AuthContext>
        </NotificationProvider>
      </QueryClientProvider>,
    )
    fireEvent.mouseDown(await screen.findByLabelText(/Employee/))
    fireEvent.click(await screen.findByRole('option', { name: /Fictional Physician/ }))
    fireEvent.change(screen.getByLabelText(/License number/), { target: { value: 'LIC-100' } })
    fireEvent.change(screen.getByLabelText(/Specialization/), { target: { value: 'Cardiology' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create doctor profile' }))
    expect(await screen.findByText('Doctor details destination')).toBeVisible()
    expect(doctorApi.createDoctor).toHaveBeenCalledWith(
      expect.objectContaining({
        employeeId: doctor.employeeId,
        licenseNumber: 'LIC-100',
      }),
    )
  })
})

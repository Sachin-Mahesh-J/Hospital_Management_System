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
import * as departmentApi from './api'
import { DepartmentCreatePage } from './DepartmentCreatePage'
import { DepartmentListPage } from './DepartmentListPage'
import { useUpdateDepartment } from './hooks'
import type { Department } from './types'

vi.mock('./api')

const department: Department = {
  id: '22222222-2222-4222-8222-222222222222',
  code: 'CARD',
  name: 'Cardiology',
  description: 'Fictional cardiology',
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
  permissions = ['department.read', 'department.create', 'department.update'],
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
          <DepartmentListPage />
        </MemoryRouter>
      </AuthContext>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('department list', () => {
  it('shows loading and successful department data', async () => {
    let resolve!: (value: Awaited<ReturnType<typeof departmentApi.fetchDepartments>>) => void
    vi.mocked(departmentApi.fetchDepartments).mockReturnValue(
      new Promise((done) => { resolve = done }),
    )
    renderList()
    expect(screen.getByRole('status')).toHaveTextContent('Loading departments')

    resolve({
      data: [department],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    })
    expect(await screen.findByText(department.code)).toBeVisible()
    expect(screen.getByText('Cardiology')).toBeVisible()
  })

  it('shows request errors and empty results', async () => {
    vi.mocked(departmentApi.fetchDepartments).mockRejectedValueOnce(
      new ApiError('Department service unavailable.', 503),
    )
    const { unmount } = renderList()
    expect(await screen.findByText('Department service unavailable.')).toBeVisible()
    unmount()

    vi.mocked(departmentApi.fetchDepartments).mockResolvedValueOnce({
      data: [],
      pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
    })
    renderList()
    expect(await screen.findByRole('heading', { name: 'No departments found' })).toBeVisible()
  })

  it('submits search and status filters', async () => {
    vi.mocked(departmentApi.fetchDepartments).mockResolvedValue({
      data: [department],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    })
    renderList()
    expect(await screen.findByText(department.code)).toBeVisible()
    fireEvent.change(screen.getByLabelText(/Search by code/), {
      target: { value: 'CARD' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    await waitFor(() =>
      expect(departmentApi.fetchDepartments).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'CARD', page: 1 }),
      ),
    )
    fireEvent.mouseDown(screen.getByLabelText('Status'))
    fireEvent.click(await screen.findByRole('option', { name: 'active' }))
    await waitFor(() =>
      expect(departmentApi.fetchDepartments).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'active' }),
      ),
    )
  })

  it('hides create when the user cannot create departments', async () => {
    vi.mocked(departmentApi.fetchDepartments).mockResolvedValue({
      data: [department],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    })
    renderList(createClient(), ['department.read'])
    expect(await screen.findByText(department.code)).toBeVisible()
    expect(screen.queryByRole('link', { name: 'Create department' })).toBeNull()
  })
})

describe('department create and query invalidation', () => {
  it('creates a department and navigates to details', async () => {
    vi.mocked(departmentApi.createDepartment).mockResolvedValue(department)
    render(
      <QueryClientProvider client={createClient()}>
        <NotificationProvider>
          <MemoryRouter initialEntries={['/departments/new']}>
            <Routes>
              <Route path="/departments/new" element={<DepartmentCreatePage />} />
              <Route path="/departments/:departmentId" element={<div>Department details destination</div>} />
            </Routes>
          </MemoryRouter>
        </NotificationProvider>
      </QueryClientProvider>,
    )
    fireEvent.change(screen.getByLabelText(/^Code/), { target: { value: 'CARD' } })
    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: 'Cardiology' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create department' }))
    expect(await screen.findByText('Department details destination')).toBeVisible()
    expect(departmentApi.createDepartment).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'CARD', name: 'Cardiology' }),
    )
  })

  it('invalidates detail and list queries after an update', async () => {
    vi.mocked(departmentApi.updateDepartment).mockResolvedValue({
      ...department,
      status: 'inactive',
    })
    const client = createClient()
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(() => useUpdateDepartment(department.id), { wrapper })
    await result.current.mutateAsync({ status: 'inactive' })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['departments', 'list'] })
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['departments', 'detail', department.id],
    })
  })
})

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../../auth/authContext'
import { NotificationProvider } from '../../shared/notifications/NotificationProvider'
import * as auditApi from './api'
import { AuditListPage } from './AuditListPage'
import type { AuditRecord } from './types'

vi.mock('./api')

const record: AuditRecord = {
  id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  occurredAt: '2026-01-02T00:00:00.000Z',
  actorUserId: 'user-1',
  actorUsername: 'administrator',
  action: 'attendance.update',
  resourceType: 'attendance',
  resourceId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  requestId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  outcome: 'success',
  metadata: { fields: ['status'] },
}

function createClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}

function renderPage() {
  const auth: AuthContextValue = {
    user: {
      id: 'user-1',
      username: 'administrator',
      roles: ['administrator'],
      permissions: ['audit.read'],
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
          <MemoryRouter>
            <AuditListPage />
          </MemoryRouter>
        </AuthContext>
      </NotificationProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(auditApi.fetchAudit).mockResolvedValue({
    data: [record],
    pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
  })
  vi.mocked(auditApi.exportAudit).mockResolvedValue(new Blob(['ok']))
})

describe('AuditListPage', () => {
  it('lists sanitized audit fields and export controls', async () => {
    renderPage()
    expect(await screen.findByText('attendance.update')).toBeVisible()
    expect(screen.getByText('fields=status')).toBeVisible()
    expect(screen.queryByText(/password/i)).toBeNull()
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Export PDF' })).toBeVisible()
  })

  it('exports using the same filters', async () => {
    renderPage()
    await screen.findByText('attendance.update')
    fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }))
    await waitFor(() => expect(auditApi.exportAudit).toHaveBeenCalled())
    expect(vi.mocked(auditApi.exportAudit).mock.calls[0]?.[1]).toBe('csv')
  })
})

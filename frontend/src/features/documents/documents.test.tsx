import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../../auth/authContext'
import { NotificationProvider } from '../../shared/notifications/NotificationProvider'
import * as documentApi from './api'
import { PatientDocumentsPanel } from './PatientDocumentsPanel'
import type { PatientDocument } from './types'

vi.mock('./api')

const document: PatientDocument = {
  id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
  patientId: '11111111-1111-4111-8111-111111111111',
  uploadedByUserId: 'user-1',
  originalName: 'scan.pdf',
  detectedMediaType: 'application/pdf',
  sizeBytes: '1200',
  title: 'Scan',
  category: 'medical_report',
  status: 'available',
  description: null,
  uploadedAt: '2026-01-01T00:00:00.000Z',
  deletedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function createClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}

function renderPanel(permissions: string[]) {
  const auth: AuthContextValue = {
    user: { id: 'user-1', username: 'doctor', roles: ['doctor'], permissions },
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
            <PatientDocumentsPanel patientId={document.patientId} />
          </MemoryRouter>
        </AuthContext>
      </NotificationProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(documentApi.fetchDocuments).mockResolvedValue({
    data: [document],
    pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
  })
})

describe('PatientDocumentsPanel', () => {
  it('lists documents and hides write actions without permission', async () => {
    renderPanel(['patient_document.read'])
    expect(await screen.findByText('Scan')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Open' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Upload document' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull()
  })

  it('shows upload when permitted', async () => {
    renderPanel(['patient_document.read', 'patient_document.create'])
    fireEvent.click(await screen.findByRole('button', { name: 'Upload document' }))
    expect(screen.getByRole('heading', { name: 'Upload document' })).toBeVisible()
    expect(screen.getByText(/cannot be replaced/i)).toBeVisible()
  })
})

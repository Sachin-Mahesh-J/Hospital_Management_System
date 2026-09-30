import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../../auth/authContext'
import { NotificationProvider } from '../../shared/notifications/NotificationProvider'
import * as scheduleApi from './api'
import { DoctorSchedulePanel } from './DoctorSchedulePanel'
import { localDateTimeToOffsetIso } from './types'

vi.mock('./api')

function createClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}

function renderPanel(permissions = ['doctor_schedule.read', 'doctor_schedule.create']) {
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
          <DoctorSchedulePanel doctorId="44444444-4444-4444-8444-444444444444" />
        </AuthContext>
      </NotificationProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(scheduleApi.fetchDoctorSchedules).mockResolvedValue({
    data: [],
    pagination: { page: 1, pageSize: 50, totalItems: 0, totalPages: 0 },
  })
})

describe('schedule helpers', () => {
  it('attaches the hospital timezone offset to date-time values', () => {
    const iso = localDateTimeToOffsetIso('2026-10-02T09:00')
    expect(iso).toBe('2026-10-02T09:00:00+05:30')
  })
})

describe('doctor schedule panel', () => {
  it('shows empty state and hides write controls without create permission', async () => {
    renderPanel(['doctor_schedule.read'])
    expect(await screen.findByRole('heading', { name: 'No schedules found' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Create schedule' })).toBeNull()
  })

  it('rejects inverted local time ranges before calling the API', async () => {
    renderPanel()
    expect(await screen.findByRole('heading', { name: 'No schedules found' })).toBeVisible()
    fireEvent.change(screen.getByLabelText(/Start/), {
      target: { value: '2026-10-02T12:00' },
    })
    fireEvent.change(screen.getByLabelText(/End/), {
      target: { value: '2026-10-02T09:00' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create schedule' }))
    expect(await screen.findByText('Schedule end must be after schedule start.')).toBeVisible()
    expect(scheduleApi.createDoctorSchedule).not.toHaveBeenCalled()
  })
})

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../api/client'
import { AuthContext, type AuthContextValue } from '../../auth/authContext'
import { NotificationProvider } from '../../shared/notifications/NotificationProvider'
import * as doctorScheduleApi from '../doctor-schedules/api'
import * as doctorApi from '../doctors/api'
import * as patientApi from '../patients/api'
import * as appointmentApi from './api'
import { AppointmentCalendarPage } from './AppointmentCalendarPage'
import { AppointmentCreatePage } from './AppointmentCreatePage'
import { AppointmentDetailPage } from './AppointmentDetailPage'
import { AppointmentListPage } from './AppointmentListPage'
import { useRescheduleAppointment } from './hooks'
import type { Appointment } from './types'

vi.mock('./api')
vi.mock('../patients/api')
vi.mock('../doctors/api')
vi.mock('../doctor-schedules/api')

const appointment: Appointment = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  patientId: '11111111-1111-4111-8111-111111111111',
  doctorId: '44444444-4444-4444-8444-444444444444',
  startsAt: '2030-06-01T10:00:00.000Z',
  endsAt: '2030-06-01T11:00:00.000Z',
  status: 'scheduled',
  reason: 'Review',
  cancellationReason: null,
  cancelledAt: null,
  cancelledByUserId: null,
  rescheduledFromAppointmentId: null,
  createdByUserId: 'user-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  patient: {
    id: '11111111-1111-4111-8111-111111111111',
    patientNumber: 'P-11111111-1111-4111-8111-111111111111',
    firstName: 'Fictional',
    lastName: 'Patient',
    status: 'active',
  },
  doctor: {
    id: '44444444-4444-4444-8444-444444444444',
    licenseNumber: 'LIC-100',
    specialization: 'Cardiology',
    status: 'active',
    employee: {
      id: '33333333-3333-4333-8333-333333333333',
      employeeNumber: 'E-33333333-3333-4333-8333-333333333333',
      firstName: 'Fictional',
      lastName: 'Physician',
      employmentStatus: 'active',
    },
  },
  cancelledBy: null,
  createdBy: { id: 'user-1', username: 'receptionist' },
  rescheduledFrom: null,
  rescheduledTo: null,
  overlapsApprovedLeave: false,
}

function createClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}

const allPermissions = [
  'appointment.read',
  'appointment.create',
  'appointment.update',
  'appointment.cancel',
  'appointment.reschedule',
  'appointment.status.update',
  'patient.read',
  'doctor.read',
  'doctor_schedule.read',
]

function authValue(permissions = allPermissions): AuthContextValue {
  return {
    user: {
      id: 'user-1',
      username: 'receptionist',
      roles: ['receptionist'],
      permissions,
    },
    isBootstrapping: false,
    login: async () => undefined,
    logout: async () => undefined,
    changePassword: async () => undefined,
  }
}

function renderList(permissions = allPermissions) {
  return render(
    <QueryClientProvider client={createClient()}>
      <AuthContext value={authValue(permissions)}>
        <MemoryRouter>
          <AppointmentListPage />
        </MemoryRouter>
      </AuthContext>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(patientApi.fetchPatients).mockResolvedValue({
    data: [{
      id: appointment.patient.id,
      patientNumber: appointment.patient.patientNumber,
      firstName: appointment.patient.firstName,
      lastName: appointment.patient.lastName,
      dateOfBirth: null,
      dateOfBirthPrecision: 'unknown',
      sexAtRegistration: null,
      phone: null,
      email: null,
      addressText: null,
      emergencyContactName: null,
      emergencyContactPhone: null,
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }],
    pagination: { page: 1, pageSize: 100, totalItems: 1, totalPages: 1 },
  })
  vi.mocked(doctorApi.fetchDoctors).mockResolvedValue({
    data: [{
      id: appointment.doctor.id,
      employeeId: appointment.doctor.employee.id,
      employee: {
        id: appointment.doctor.employee.id,
        employeeNumber: appointment.doctor.employee.employeeNumber,
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
        firstName: appointment.doctor.employee.firstName,
        lastName: appointment.doctor.employee.lastName,
        phone: null,
        email: null,
        jobTitle: 'Physician',
        employmentStatus: 'active',
        hireDate: '2022-01-01',
        endDate: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      licenseNumber: appointment.doctor.licenseNumber,
      specialization: appointment.doctor.specialization,
      professionalSummary: null,
      contactExtension: null,
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }],
    pagination: { page: 1, pageSize: 100, totalItems: 1, totalPages: 1 },
  })
  vi.mocked(doctorScheduleApi.fetchDoctorSchedules).mockResolvedValue({
    data: [{
      id: '55555555-5555-4555-8555-555555555555',
      doctorId: appointment.doctorId,
      startsAt: '2030-06-01T09:00:00.000Z',
      endsAt: '2030-06-01T12:00:00.000Z',
      status: 'available',
      note: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }],
    pagination: { page: 1, pageSize: 50, totalItems: 1, totalPages: 1 },
  })
})

describe('appointment list', () => {
  it('shows appointments and hides booking without create permission', async () => {
    vi.mocked(appointmentApi.fetchAppointments).mockResolvedValue({
      data: [appointment],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    })
    renderList(['appointment.read', 'patient.read', 'doctor.read'])
    expect(await screen.findByText('Review')).toBeVisible()
    expect(screen.getByText(/Fictional Patient/)).toBeVisible()
    expect(screen.getByText('1 Jun 2030, 3:30 PM')).toBeVisible()
    expect(screen.queryByRole('link', { name: 'Book appointment' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Calendar' })).toBeVisible()
  })

  it('shows request errors and empty results', async () => {
    vi.mocked(appointmentApi.fetchAppointments).mockRejectedValueOnce(
      new ApiError('Appointment service unavailable.', 503),
    )
    const { unmount } = renderList()
    expect(await screen.findByText('Appointment service unavailable.')).toBeVisible()
    unmount()

    vi.mocked(appointmentApi.fetchAppointments).mockResolvedValueOnce({
      data: [],
      pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
    })
    renderList()
    expect(await screen.findByRole('heading', { name: 'No appointments found' })).toBeVisible()
  })

  it('filters by status', async () => {
    vi.mocked(appointmentApi.fetchAppointments).mockResolvedValue({
      data: [appointment],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    })
    renderList()
    expect(await screen.findByText('Review')).toBeVisible()
    fireEvent.mouseDown(screen.getByLabelText('Status'))
    fireEvent.click(await screen.findByRole('option', { name: 'scheduled' }))
    await waitFor(() =>
      expect(appointmentApi.fetchAppointments).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'scheduled', page: 1 }),
      ),
    )
  })
})

describe('appointment create form', () => {
  it('rejects inverted times before calling the API', async () => {
    render(
      <QueryClientProvider client={createClient()}>
        <NotificationProvider>
          <AuthContext value={authValue()}>
            <MemoryRouter>
              <AppointmentCreatePage />
            </MemoryRouter>
          </AuthContext>
        </NotificationProvider>
      </QueryClientProvider>,
    )
    fireEvent.mouseDown(await screen.findByRole('combobox', { name: /Patient/ }))
    fireEvent.click(await screen.findByRole('option', { name: /Fictional Patient/ }))
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /Doctor/ }))
    fireEvent.click(await screen.findByRole('option', { name: /Fictional Physician/ }))
    fireEvent.change(screen.getByLabelText('Start'), { target: { value: '2030-06-01T12:00' } })
    fireEvent.change(screen.getByLabelText('End'), { target: { value: '2030-06-01T09:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Book appointment' }))
    expect(await screen.findByText('Appointment end must be after appointment start.')).toBeVisible()
    expect(appointmentApi.createAppointment).not.toHaveBeenCalled()
  })

  it('displays conflict errors from the API', async () => {
    vi.mocked(appointmentApi.createAppointment).mockRejectedValue(
      new ApiError('This doctor already has an active appointment in that interval.', 409),
    )
    render(
      <QueryClientProvider client={createClient()}>
        <NotificationProvider>
          <AuthContext value={authValue()}>
            <MemoryRouter>
              <AppointmentCreatePage />
            </MemoryRouter>
          </AuthContext>
        </NotificationProvider>
      </QueryClientProvider>,
    )
    fireEvent.mouseDown(await screen.findByRole('combobox', { name: /Patient/ }))
    fireEvent.click(await screen.findByRole('option', { name: /Fictional Patient/ }))
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /Doctor/ }))
    fireEvent.click(await screen.findByRole('option', { name: /Fictional Physician/ }))
    fireEvent.change(screen.getByLabelText('Start'), { target: { value: '2030-06-01T10:00' } })
    fireEvent.change(screen.getByLabelText('End'), { target: { value: '2030-06-01T11:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Book appointment' }))
    expect(
      await screen.findByText('This doctor already has an active appointment in that interval.'),
    ).toBeVisible()
  })
})

describe('appointment detail actions', () => {
  it('cancels through a dialog and hides unauthorized actions', async () => {
    vi.mocked(appointmentApi.fetchAppointment).mockResolvedValue(appointment)
    vi.mocked(appointmentApi.cancelAppointment).mockResolvedValue({
      ...appointment,
      status: 'cancelled',
      cancellationReason: 'Patient request',
      cancelledAt: '2030-06-01T09:00:00.000Z',
      cancelledByUserId: 'user-1',
      cancelledBy: { id: 'user-1', username: 'receptionist' },
    })
    render(
      <QueryClientProvider client={createClient()}>
        <NotificationProvider>
          <AuthContext value={authValue()}>
            <MemoryRouter initialEntries={[`/appointments/${appointment.id}`]}>
              <Routes>
                <Route path="/appointments/:appointmentId" element={<AppointmentDetailPage />} />
              </Routes>
            </MemoryRouter>
          </AuthContext>
        </NotificationProvider>
      </QueryClientProvider>,
    )
    expect(await screen.findByText('Review')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel appointment' }))
    fireEvent.change(await screen.findByRole('textbox', { name: /Cancellation reason/ }), {
      target: { value: 'Patient request' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Confirm cancellation' }))
    await waitFor(() =>
      expect(appointmentApi.cancelAppointment).toHaveBeenCalledWith(
        appointment.id,
        'Patient request',
      ),
    )
  })

  it('hides lifecycle actions without permission', async () => {
    vi.mocked(appointmentApi.fetchAppointment).mockResolvedValue(appointment)
    render(
      <QueryClientProvider client={createClient()}>
        <NotificationProvider>
          <AuthContext value={authValue(['appointment.read'])}>
            <MemoryRouter initialEntries={[`/appointments/${appointment.id}`]}>
              <Routes>
                <Route path="/appointments/:appointmentId" element={<AppointmentDetailPage />} />
              </Routes>
            </MemoryRouter>
          </AuthContext>
        </NotificationProvider>
      </QueryClientProvider>,
    )
    expect(await screen.findByText('Review')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Cancel appointment' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Reschedule' })).toBeNull()
    expect(screen.queryByRole('button', { name: /Mark / })).toBeNull()
  })
})

describe('appointment calendar', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('loads existing appointments into day week and month views', async () => {
    vi.mocked(appointmentApi.fetchAppointments).mockResolvedValue({
      data: [appointment],
      pagination: { page: 1, pageSize: 100, totalItems: 1, totalPages: 1 },
    })
    render(
      <QueryClientProvider client={createClient()}>
        <AuthContext value={authValue()}>
          <MemoryRouter>
            <AppointmentCalendarPage />
          </MemoryRouter>
        </AuthContext>
      </QueryClientProvider>,
    )
    expect(await screen.findByRole('heading', { name: 'Appointment calendar' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Day' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Week' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Month' })).toBeVisible()
    expect(screen.getByLabelText('Doctor')).toBeVisible()
    expect(screen.getByText(/Approved leave does not cancel/)).toBeVisible()
    await waitFor(() => expect(appointmentApi.fetchAppointments).toHaveBeenCalled())
    fireEvent.click(screen.getByRole('button', { name: 'Month' }))
    await waitFor(() => expect(vi.mocked(appointmentApi.fetchAppointments).mock.calls.length).toBeGreaterThan(1))
  })

  it('opens on hospital today, highlights today, and keeps today after navigation', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-09-30T04:30:00.000Z'))
    vi.mocked(appointmentApi.fetchAppointments).mockResolvedValue({
      data: [],
      pagination: { page: 1, pageSize: 100, totalItems: 0, totalPages: 0 },
    })
    render(
      <QueryClientProvider client={createClient()}>
        <AuthContext value={authValue()}>
          <MemoryRouter>
            <AppointmentCalendarPage />
          </MemoryRouter>
        </AuthContext>
      </QueryClientProvider>,
    )
    expect(await screen.findByRole('heading', { name: 'Appointment calendar' })).toBeVisible()
    expect(screen.getByText('30 Sep 2026')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Day' }))
    expect(screen.getByText(/Today/)).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Month' }))
    expect(screen.getByText('September 2026')).toBeVisible()
    expect(screen.getAllByText('Today').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText('October 2026')).toBeVisible()
    expect(screen.getByText('Today')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Today' }))
    expect(screen.getByText('September 2026')).toBeVisible()
  })
})

describe('appointment query invalidation', () => {
  it('invalidates list and original plus replacement details after reschedule', async () => {
    const replacement = {
      ...appointment,
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      rescheduledFromAppointmentId: appointment.id,
    }
    vi.mocked(appointmentApi.rescheduleAppointment).mockResolvedValue(replacement)
    const client = createClient()
    const { result } = renderHook(() => useRescheduleAppointment(appointment.id), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    })
    await result.current.mutateAsync({
      doctorId: appointment.doctorId,
      startsAt: '2030-06-01T11:00:00.000Z',
      endsAt: '2030-06-01T12:00:00.000Z',
    })
    expect(client.getQueryData(['appointments', 'detail', replacement.id])).toEqual(replacement)
    expect(appointmentApi.rescheduleAppointment).toHaveBeenCalledWith(
      appointment.id,
      expect.objectContaining({ doctorId: appointment.doctorId }),
    )
  })
})

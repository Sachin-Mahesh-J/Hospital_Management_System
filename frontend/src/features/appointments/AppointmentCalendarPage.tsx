import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { Can } from '../../auth/Can'
import { useAuth } from '../../auth/authContext'
import { hasPermission } from '../../auth/permission'
import { Page } from '../../shared/components/Page'
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../shared/components/StateViews'
import { useDoctors } from '../doctors/hooks'
import { fetchAppointments } from './api'
import {
  addDays,
  appointmentOverlapsLocalDay,
  calendarRange,
  CALENDAR_END_HOUR,
  CALENDAR_START_HOUR,
  durationMinutes,
  formatDayHeading,
  HOUR_HEIGHT_PX,
  minutesFromDayStart,
  slotStart,
  startOfLocalDay,
  toLocalDateTimeValue,
  type CalendarView,
} from './calendarRange'
import { useQuery } from '@tanstack/react-query'
import { appointmentKeys } from './hooks'
import { doctorLabel, patientLabel, type Appointment } from './types'

function useCalendarAppointments(
  view: CalendarView,
  anchor: Date,
  doctorId: string,
) {
  const range = calendarRange(anchor, view)
  return useQuery({
    queryKey: [...appointmentKeys.lists(), 'calendar', view, range.from.toISOString(), doctorId],
    queryFn: async () => {
      const collected: Appointment[] = []
      let page = 1
      let totalPages = 1
      do {
        const result = await fetchAppointments({
          page,
          pageSize: 100,
          startsAtFrom: range.from.toISOString(),
          startsAtTo: range.to.toISOString(),
          ...(doctorId ? { doctorId } : {}),
          sortBy: 'startsAt',
          sortOrder: 'asc',
        })
        collected.push(...result.data)
        totalPages = result.pagination.totalPages
        page += 1
      } while (page <= totalPages && page <= 10)
      return {
        appointments: collected,
        truncated: totalPages > 10,
        from: range.from,
        to: range.to,
      }
    },
  })
}

function AppointmentBlock({
  appointment,
  day,
}: {
  appointment: Appointment
  day: Date
}) {
  const startMinutes = Math.max(0, minutesFromDayStart(appointment.startsAt, day))
  const gridStart = CALENDAR_START_HOUR * 60
  const gridEnd = CALENDAR_END_HOUR * 60
  const topMinutes = Math.max(gridStart, startMinutes)
  const endMinutes = Math.min(
    gridEnd,
    minutesFromDayStart(appointment.endsAt, day),
  )
  const heightMinutes = Math.max(15, endMinutes - topMinutes)
  return (
    <Box
      component={Link}
      to={`/appointments/${appointment.id}`}
      sx={{
        position: 'absolute',
        left: 4,
        right: 4,
        top: ((topMinutes - gridStart) / 60) * HOUR_HEIGHT_PX,
        height: (heightMinutes / 60) * HOUR_HEIGHT_PX,
        bgcolor: appointment.overlapsApprovedLeave ? 'warning.light' : 'primary.light',
        color: 'text.primary',
        borderRadius: 1,
        px: 0.5,
        overflow: 'hidden',
        textDecoration: 'none',
        fontSize: 12,
        zIndex: 1,
      }}
    >
      {patientLabel(appointment.patient)} · {doctorLabel(appointment.doctor)}
      {appointment.overlapsApprovedLeave ? ' · leave overlap' : ''}
    </Box>
  )
}

function DayColumn({
  day,
  appointments,
  canCreate,
  doctorId,
}: {
  day: Date
  appointments: Appointment[]
  canCreate: boolean
  doctorId: string
}) {
  const navigate = useNavigate()
  const hours = Array.from(
    { length: CALENDAR_END_HOUR - CALENDAR_START_HOUR },
    (_, index) => CALENDAR_START_HOUR + index,
  )
  const dayAppointments = appointments.filter((appointment) =>
    appointmentOverlapsLocalDay(appointment.startsAt, appointment.endsAt, day),
  )
  return (
    <Box sx={{ position: 'relative', minWidth: 160, flex: 1, borderLeft: 1, borderColor: 'divider' }}>
      <Typography sx={{ px: 1, py: 0.5 }} variant="subtitle2">
        {formatDayHeading(day)}
      </Typography>
      <Box sx={{ position: 'relative', height: hours.length * HOUR_HEIGHT_PX }}>
        {hours.map((hour) => (
          <Box
            key={hour}
            onClick={() => {
              if (!canCreate) return
              const start = slotStart(day, hour)
              const end = slotStart(day, hour + 1)
              const params = new URLSearchParams({
                startsAt: toLocalDateTimeValue(start),
                endsAt: toLocalDateTimeValue(end),
              })
              if (doctorId) params.set('doctorId', doctorId)
              navigate(`/appointments/new?${params.toString()}`)
            }}
            sx={{
              height: HOUR_HEIGHT_PX,
              borderTop: 1,
              borderColor: 'divider',
              cursor: canCreate ? 'pointer' : 'default',
            }}
          >
            <Typography color="text.secondary" sx={{ px: 0.5 }} variant="caption">
              {String(hour).padStart(2, '0')}:00
            </Typography>
          </Box>
        ))}
        {dayAppointments.map((appointment) => (
          <AppointmentBlock appointment={appointment} day={day} key={appointment.id} />
        ))}
      </Box>
    </Box>
  )
}

export function AppointmentCalendarPage() {
  const [view, setView] = useState<CalendarView>('week')
  const [anchor, setAnchor] = useState(() => startOfLocalDay(new Date()))
  const [doctorId, setDoctorId] = useState('')
  const { user } = useAuth()
  const canCreate = hasPermission(user, 'appointment.create')
  const canReadDoctors = hasPermission(user, 'doctor.read')
  const doctors = useDoctors({ page: 1, pageSize: 100, status: 'active', employmentStatus: 'active' })
  const query = useCalendarAppointments(view, anchor, doctorId)
  const days = useMemo(() => {
    const range = calendarRange(anchor, view)
    if (view === 'day') return [range.from]
    if (view === 'week') {
      return Array.from({ length: 7 }, (_, index) => addDays(range.from, index))
    }
    return Array.from({ length: 42 }, (_, index) => addDays(range.from, index))
  }, [anchor, view])

  const shift = (direction: number) => {
    if (view === 'day') setAnchor((current) => addDays(current, direction))
    else if (view === 'week') setAnchor((current) => addDays(current, direction * 7))
    else setAnchor((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1))
  }

  return (
    <Page
      title="Appointment calendar"
      description="Day, week, and month views use actual start and end times. Drag-and-drop rescheduling is not available. Use the existing reschedule workflow."
      actions={
        <Stack direction="row" spacing={1}>
          <Button component={Link} to="/appointments">List</Button>
          <Can permission="appointment.create">
            <Button component={Link} to="/appointments/new" variant="contained">Book appointment</Button>
          </Can>
        </Stack>
      }
    >
      <Paper sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: { md: 'center' } }}>
          <ToggleButtonGroup
            exclusive
            onChange={(_event, value: CalendarView | null) => {
              if (value) setView(value)
            }}
            size="small"
            value={view}
          >
            <ToggleButton value="day">Day</ToggleButton>
            <ToggleButton value="week">Week</ToggleButton>
            <ToggleButton value="month">Month</ToggleButton>
          </ToggleButtonGroup>
          <Button onClick={() => shift(-1)}>Previous</Button>
          <Typography>{anchor.toLocaleDateString(undefined, { month: 'long', year: 'numeric', day: 'numeric' })}</Typography>
          <Button onClick={() => shift(1)}>Next</Button>
          <Button onClick={() => setAnchor(startOfLocalDay(new Date()))}>Today</Button>
          {canReadDoctors && (
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel id="calendar-doctor">Doctor</InputLabel>
              <Select
                label="Doctor"
                labelId="calendar-doctor"
                onChange={(event) => setDoctorId(event.target.value)}
                value={doctorId}
              >
                <MenuItem value="">All doctors</MenuItem>
                {(doctors.data?.data ?? []).map((doctor) => (
                  <MenuItem key={doctor.id} value={doctor.id}>
                    {doctor.employee.firstName} {doctor.employee.lastName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Stack>
      </Paper>
      <Alert severity="info">
        Approved leave does not cancel existing appointments. Highlighted blocks overlap a doctor’s approved leave
        and should be cancelled or rescheduled through the existing workflows. Pending, rejected, and cancelled leave
        do not restrict booking.
      </Alert>
      {query.isLoading && <LoadingState label="Loading calendar" />}
      {query.isError && (
        <ErrorState
          message={query.error instanceof ApiError ? query.error.message : 'Calendar appointments could not be loaded.'}
          onRetry={() => void query.refetch()}
        />
      )}
      {query.data?.truncated && (
        <Alert severity="warning">The calendar shows the first 1,000 appointments in this range.</Alert>
      )}
      {query.data && query.data.appointments.length === 0 && view === 'month' && (
        <EmptyState title="No appointments in this range" description="Change the doctor filter or book an appointment." />
      )}
      {query.data && view !== 'month' && (
        <Paper sx={{ overflow: 'auto' }}>
          <Stack direction="row">
            {days.map((day) => (
              <DayColumn
                appointments={query.data.appointments}
                canCreate={canCreate}
                day={day}
                doctorId={doctorId}
                key={day.toISOString()}
              />
            ))}
          </Stack>
        </Paper>
      )}
      {query.data && view === 'month' && (
        <Paper sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {days.map((day) => {
            const items = query.data.appointments.filter((appointment) =>
              appointmentOverlapsLocalDay(appointment.startsAt, appointment.endsAt, day),
            )
            return (
              <Box
                key={day.toISOString()}
                onClick={() => {
                  setAnchor(startOfLocalDay(day))
                  setView('day')
                }}
                sx={{
                  minHeight: 120,
                  border: 1,
                  borderColor: 'divider',
                  p: 1,
                  cursor: 'pointer',
                  bgcolor: day.getMonth() === anchor.getMonth() ? 'background.paper' : 'action.hover',
                }}
              >
                <Typography variant="caption">{day.getDate()}</Typography>
                <Stack spacing={0.5}>
                  {items.slice(0, 4).map((appointment) => (
                    <Button
                      component={Link}
                      key={appointment.id}
                      onClick={(event) => event.stopPropagation()}
                      size="small"
                      sx={{
                        justifyContent: 'flex-start',
                        bgcolor: appointment.overlapsApprovedLeave ? 'warning.light' : undefined,
                      }}
                      to={`/appointments/${appointment.id}`}
                    >
                      {new Date(appointment.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {' '}
                      ({durationMinutes(appointment.startsAt, appointment.endsAt)}m)
                      {appointment.overlapsApprovedLeave ? ' leave' : ''}
                    </Button>
                  ))}
                  {items.length > 4 && (
                    <Typography variant="caption">+{items.length - 4} more</Typography>
                  )}
                </Stack>
              </Box>
            )
          })}
        </Paper>
      )}
    </Page>
  )
}

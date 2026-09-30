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
  Tooltip,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { Can } from '../../auth/Can'
import { useAuth } from '../../auth/authContext'
import { hasPermission } from '../../auth/permission'
import { Page } from '../../shared/components/Page'
import { formatStatusLabel } from '../../shared/components/formatStatusLabel'
import { FilterBar } from '../../shared/components/FilterBar'
import { filterControlSx } from '../../shared/components/layoutSx'
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../shared/components/StateViews'
import {
  formatHospitalTime,
  hospitalToday,
  isHospitalToday,
} from '../../shared/datetime/hospitalTime'
import { useDoctors } from '../doctors/hooks'
import { fetchAppointments } from './api'
import {
  appointmentOverlapsHospitalDay,
  calendarRange,
  CALENDAR_END_HOUR,
  CALENDAR_START_HOUR,
  durationMinutes,
  formatCalendarHeading,
  formatDayHeading,
  HOUR_HEIGHT_PX,
  hospitalSlotDateTimeValue,
  minutesFromHospitalDayStart,
  shiftCalendarAnchor,
  type CalendarView,
} from './calendarRange'
import { useQuery } from '@tanstack/react-query'
import { appointmentKeys } from './hooks'
import { doctorLabel, patientLabel, type Appointment } from './types'

function useCalendarAppointments(
  view: CalendarView,
  anchorDate: string,
  doctorId: string,
) {
  const range = calendarRange(anchorDate, view)
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
  day: string
}) {
  const startMinutes = Math.max(0, minutesFromHospitalDayStart(appointment.startsAt, day))
  const gridStart = CALENDAR_START_HOUR * 60
  const gridEnd = CALENDAR_END_HOUR * 60
  const topMinutes = Math.max(gridStart, startMinutes)
  const endMinutes = Math.min(
    gridEnd,
    minutesFromHospitalDayStart(appointment.endsAt, day),
  )
  const heightMinutes = Math.max(15, endMinutes - topMinutes)
  const heightPx = (heightMinutes / 60) * HOUR_HEIGHT_PX
  const patient = patientLabel(appointment.patient)
  const timeRange = `${formatHospitalTime(appointment.startsAt)}–${formatHospitalTime(appointment.endsAt)}`
  const statusLabel = formatStatusLabel(appointment.status)
  const doctor = doctorLabel(appointment.doctor)
  const fullLabel = [
    patient,
    timeRange,
    statusLabel,
    doctor,
    appointment.overlapsApprovedLeave ? 'Overlaps approved leave' : null,
  ].filter(Boolean).join('. ')

  return (
    <Tooltip
      describeChild
      title={
        <Box>
          <Typography variant="subtitle2">{patient}</Typography>
          <Typography variant="body2">{timeRange}</Typography>
          <Typography variant="body2">{statusLabel}</Typography>
          <Typography variant="body2">{doctor}</Typography>
          {appointment.overlapsApprovedLeave && (
            <Typography variant="body2">Overlaps approved leave</Typography>
          )}
        </Box>
      }
    >
      <Box
        aria-label={fullLabel}
        component={Link}
        to={`/appointments/${appointment.id}`}
        sx={{
          position: 'absolute',
          left: 4,
          right: 4,
          top: ((topMinutes - gridStart) / 60) * HOUR_HEIGHT_PX,
          height: heightPx,
          minHeight: 18,
          bgcolor: appointment.overlapsApprovedLeave ? 'warning.light' : 'primary.light',
          color: 'text.primary',
          borderRadius: 1,
          px: 0.75,
          py: 0.25,
          overflow: 'hidden',
          textDecoration: 'none',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          gap: 0.125,
          outlineOffset: 2,
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
          },
        }}
      >
        <Typography
          component="span"
          noWrap
          sx={{ fontWeight: 600, lineHeight: 1.2 }}
          variant="caption"
        >
          {patient}
        </Typography>
        {heightPx >= 32 && (
          <Typography component="span" noWrap sx={{ lineHeight: 1.2 }} variant="caption">
            {timeRange}
          </Typography>
        )}
        {heightPx >= 46 && (
          <Typography component="span" noWrap sx={{ lineHeight: 1.2 }} variant="caption">
            {statusLabel}
          </Typography>
        )}
      </Box>
    </Tooltip>
  )
}

function DayColumn({
  day,
  appointments,
  canCreate,
  doctorId,
}: {
  day: string
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
    appointmentOverlapsHospitalDay(appointment.startsAt, appointment.endsAt, day),
  )
  const today = isHospitalToday(day)
  return (
    <Box
      aria-current={today ? 'date' : undefined}
      sx={{ position: 'relative', minWidth: 160, flex: 1, borderLeft: 1, borderColor: today ? 'primary.main' : 'divider' }}
    >
      <Box
        sx={{
          px: 1,
          py: 0.5,
          bgcolor: today ? 'primary.main' : undefined,
          color: today ? 'primary.contrastText' : undefined,
        }}
      >
        <Typography sx={{ fontWeight: today ? 700 : 600 }} variant="subtitle2">
          {formatDayHeading(day)}
          {today ? ' · Today' : ''}
        </Typography>
      </Box>
      <Box sx={{ position: 'relative', height: hours.length * HOUR_HEIGHT_PX }}>
        {hours.map((hour) => (
          <Box
            key={hour}
            onClick={() => {
              if (!canCreate) return
              const params = new URLSearchParams({
                startsAt: hospitalSlotDateTimeValue(day, hour),
                endsAt: hospitalSlotDateTimeValue(day, hour + 1),
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
  const [anchorDate, setAnchorDate] = useState(() => hospitalToday())
  const [doctorId, setDoctorId] = useState('')
  const { user } = useAuth()
  const canCreate = hasPermission(user, 'appointment.create')
  const canReadDoctors = hasPermission(user, 'doctor.read')
  const doctors = useDoctors({ page: 1, pageSize: 100, status: 'active', employmentStatus: 'active' })
  const query = useCalendarAppointments(view, anchorDate, doctorId)
  const days = useMemo(() => calendarRange(anchorDate, view).days, [anchorDate, view])

  return (
    <Page
      title="Appointment calendar"
      actions={
        <Stack direction="row" spacing={1}>
          <Button component={Link} to="/appointments">List</Button>
          <Can permission="appointment.create">
            <Button component={Link} to="/appointments/new" variant="contained">Book appointment</Button>
          </Can>
        </Stack>
      }
    >
      <FilterBar>
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
          <Button onClick={() => setAnchorDate((current) => shiftCalendarAnchor(current, view, -1))}>
            Previous
          </Button>
          <Typography sx={{ minWidth: 0 }}>
            {formatCalendarHeading(anchorDate, view)}
          </Typography>
          <Button onClick={() => setAnchorDate((current) => shiftCalendarAnchor(current, view, 1))}>
            Next
          </Button>
          <Button onClick={() => setAnchorDate(hospitalToday())}>Today</Button>
          {canReadDoctors && (
            <FormControl size="small" sx={filterControlSx}>
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
      </FilterBar>
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
        <EmptyState
          action={
            canCreate ? (
              <Button component={Link} to="/appointments/new" variant="contained">
                Book appointment
              </Button>
            ) : undefined
          }
          description={
            canCreate
              ? 'No appointments match this calendar range. Change the doctor filter or book an appointment.'
              : 'No appointments match this calendar range. Change the doctor filter if one is applied.'
          }
          title="No appointments in this range"
        />
      )}
      {query.data && view !== 'month' && (
        <Paper sx={{ overflow: 'auto' }}>
          <Stack direction="row" sx={{ minWidth: 0 }}>
            {days.map((day) => (
              <DayColumn
                appointments={query.data.appointments}
                canCreate={canCreate}
                day={day}
                doctorId={doctorId}
                key={day}
              />
            ))}
          </Stack>
        </Paper>
      )}
      {query.data && view === 'month' && (
        <Paper sx={{ overflowX: 'auto' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(110px, 1fr))', minWidth: 770 }}>
          {days.map((day) => {
            const items = query.data.appointments.filter((appointment) =>
              appointmentOverlapsHospitalDay(appointment.startsAt, appointment.endsAt, day),
            )
            const today = isHospitalToday(day)
            const inMonth = day.slice(0, 7) === anchorDate.slice(0, 7)
            const dayNumber = Number(day.slice(8, 10))
            return (
              <Box
                aria-current={today ? 'date' : undefined}
                key={day}
                onClick={() => {
                  setAnchorDate(day)
                  setView('day')
                }}
                sx={{
                  minHeight: 120,
                  border: 1,
                  borderColor: today ? 'primary.main' : 'divider',
                  p: 1,
                  cursor: 'pointer',
                  bgcolor: today ? 'action.selected' : inMonth ? 'background.paper' : 'action.hover',
                }}
              >
                <Stack direction="row" spacing={0.5} sx={{ alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontWeight: today ? 700 : 400 }} variant="caption">
                    {dayNumber}
                  </Typography>
                  {today && (
                    <Typography color="primary" variant="caption">
                      Today
                    </Typography>
                  )}
                </Stack>
                <Stack spacing={0.5}>
                  {items.slice(0, 4).map((appointment) => {
                    const patient = patientLabel(appointment.patient)
                    const time = formatHospitalTime(appointment.startsAt)
                    const statusLabel = formatStatusLabel(appointment.status)
                    const monthLabel = [
                      patient,
                      `${time} (${durationMinutes(appointment.startsAt, appointment.endsAt)}m)`,
                      statusLabel,
                      appointment.overlapsApprovedLeave ? 'Overlaps approved leave' : null,
                    ]
                      .filter(Boolean)
                      .join('. ')
                    return (
                      <Tooltip describeChild key={appointment.id} title={monthLabel}>
                        <Button
                          aria-label={monthLabel}
                          component={Link}
                          onClick={(event) => event.stopPropagation()}
                          size="small"
                          sx={{
                            justifyContent: 'flex-start',
                            minWidth: 0,
                            px: 0.75,
                            bgcolor: appointment.overlapsApprovedLeave ? 'warning.light' : undefined,
                          }}
                          to={`/appointments/${appointment.id}`}
                        >
                          <Typography component="span" noWrap sx={{ display: 'block', width: '100%' }} variant="caption">
                            {time} {patient}
                          </Typography>
                        </Button>
                      </Tooltip>
                    )
                  })}
                  {items.length > 4 && (
                    <Typography variant="caption">+{items.length - 4} more</Typography>
                  )}
                </Stack>
              </Box>
            )
          })}
        </Box>
        </Paper>
      )}
    </Page>
  )
}

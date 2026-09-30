import {
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from '@mui/material'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
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
import { localDateTimeToOffsetIso } from '../doctor-schedules/types'
import { useDoctors } from '../doctors/hooks'
import { usePatients } from '../patients/hooks'
import { useAppointments } from './hooks'
import {
  appointmentStatuses,
  doctorLabel,
  patientLabel,
  type AppointmentStatus,
} from './types'

export function AppointmentListPage() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<AppointmentStatus | ''>('')
  const [doctorId, setDoctorId] = useState('')
  const [patientId, setPatientId] = useState('')
  const [startsAtFrom, setStartsAtFrom] = useState('')
  const [startsAtTo, setStartsAtTo] = useState('')
  const { user } = useAuth()
  const canReadDoctors = hasPermission(user, 'doctor.read')
  const canReadPatients = hasPermission(user, 'patient.read')
  const doctors = useDoctors({ page: 1, pageSize: 100 })
  const patients = usePatients({ page: 1, pageSize: 100 })
  const query = useAppointments({
    page,
    pageSize: 20,
    ...(status ? { status } : {}),
    ...(doctorId ? { doctorId } : {}),
    ...(patientId ? { patientId } : {}),
    ...(startsAtFrom ? { startsAtFrom } : {}),
    ...(startsAtTo ? { startsAtTo } : {}),
  })

  const submitRange = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const fromLocal = String(form.get('startsAtFrom') ?? '')
    const toLocal = String(form.get('startsAtTo') ?? '')
    setStartsAtFrom(fromLocal ? localDateTimeToOffsetIso(fromLocal) : '')
    setStartsAtTo(toLocal ? localDateTimeToOffsetIso(toLocal) : '')
    setPage(1)
  }

  return (
    <Page
      title="Appointments"
      description="Book, review, cancel, and reschedule outpatient appointments. Times are shown in the browser locale."
      actions={
        <Stack direction="row" spacing={1}>
          <Button component={Link} to="/appointments/calendar">
            Calendar
          </Button>
          <Can permission="appointment.create">
            <Button component={Link} to="/appointments/new" variant="contained">
              Book appointment
            </Button>
          </Can>
        </Stack>
      }
    >
      <Paper sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel id="appointment-status-filter">Status</InputLabel>
              <Select
                label="Status"
                labelId="appointment-status-filter"
                onChange={(event) => {
                  setStatus(event.target.value as AppointmentStatus | '')
                  setPage(1)
                }}
                value={status}
              >
                <MenuItem value="">All statuses</MenuItem>
                {appointmentStatuses.map((value) => (
                  <MenuItem key={value} value={value}>{value}</MenuItem>
                ))}
              </Select>
            </FormControl>
            {canReadDoctors && (
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel id="appointment-doctor-filter">Doctor</InputLabel>
                <Select
                  label="Doctor"
                  labelId="appointment-doctor-filter"
                  onChange={(event) => {
                    setDoctorId(event.target.value)
                    setPage(1)
                  }}
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
            {canReadPatients && (
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel id="appointment-patient-filter">Patient</InputLabel>
                <Select
                  label="Patient"
                  labelId="appointment-patient-filter"
                  onChange={(event) => {
                    setPatientId(event.target.value)
                    setPage(1)
                  }}
                  value={patientId}
                >
                  <MenuItem value="">All patients</MenuItem>
                  {(patients.data?.data ?? []).map((patient) => (
                    <MenuItem key={patient.id} value={patient.id}>
                      {patient.firstName} {patient.lastName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Stack>
          <Stack component="form" direction={{ xs: 'column', md: 'row' }} spacing={2} onSubmit={submitRange}>
            <TextField
              label="Starts from"
              name="startsAtFrom"
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
              type="datetime-local"
            />
            <TextField
              label="Starts before"
              name="startsAtTo"
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
              type="datetime-local"
            />
            <Button type="submit" variant="outlined">Apply time range</Button>
          </Stack>
        </Stack>
      </Paper>

      {query.isLoading && <LoadingState label="Loading appointments" />}
      {query.isError && (
        <ErrorState
          message={query.error instanceof ApiError ? query.error.message : 'Appointments could not be loaded.'}
          onRetry={() => void query.refetch()}
        />
      )}
      {query.data && query.data.data.length === 0 && (
        <EmptyState
          title="No appointments found"
          description="Adjust the filters or book an appointment."
        />
      )}
      {query.data && query.data.data.length > 0 && (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Start</TableCell>
                  <TableCell>End</TableCell>
                  <TableCell>Patient</TableCell>
                  <TableCell>Doctor</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {query.data.data.map((appointment) => (
                  <TableRow hover key={appointment.id}>
                    <TableCell>{new Date(appointment.startsAt).toLocaleString()}</TableCell>
                    <TableCell>{new Date(appointment.endsAt).toLocaleString()}</TableCell>
                    <TableCell>{patientLabel(appointment.patient)}</TableCell>
                    <TableCell>{doctorLabel(appointment.doctor)}</TableCell>
                    <TableCell>{appointment.status}</TableCell>
                    <TableCell>{appointment.reason ?? '—'}</TableCell>
                    <TableCell align="right">
                      <Button component={Link} size="small" to={`/appointments/${appointment.id}`}>
                        View
                      </Button>
                      <Can permission="appointment.update">
                        <Button component={Link} size="small" to={`/appointments/${appointment.id}/edit`}>
                          Edit reason
                        </Button>
                      </Can>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Pagination
            count={Math.max(query.data.pagination.totalPages, 1)}
            onChange={(_event, value) => setPage(value)}
            page={page}
            sx={{ alignSelf: 'center' }}
          />
        </>
      )}
    </Page>
  )
}

import { formatHospitalDateTime } from '../../shared/datetime/hospitalTime'
import {
  Alert,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
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
  Typography,
} from '@mui/material'
import { useState, type FormEvent } from 'react'
import { ApiError } from '../../api/client'
import { FormSection } from '../../shared/components/FormSection'
import { StatusChip } from '../../shared/components/StatusChip'
import { useAuth } from '../../auth/authContext'
import { hasPermission } from '../../auth/permission'
import {
  instantToLocalInput,
  localDateTimeToOffsetIso,
} from '../doctor-schedules/types'
import { useDoctorSchedules } from '../doctor-schedules/hooks'
import { useDoctors } from '../doctors/hooks'
import { usePatients } from '../patients/hooks'
import type { Appointment, AppointmentInput, AppointmentRescheduleInput } from './types'

type AppointmentFormProps = {
  appointment?: Appointment
  initialDoctorId?: string
  initialEndsAt?: string
  initialStartsAt?: string
  isPending: boolean
  lockPatient?: boolean
  onSubmit: (input: AppointmentInput | AppointmentRescheduleInput) => Promise<void>
  submitLabel: string
}

export function AppointmentForm({
  appointment,
  initialDoctorId = '',
  initialEndsAt = '',
  initialStartsAt = '',
  isPending,
  lockPatient = false,
  onSubmit,
  submitLabel,
}: AppointmentFormProps) {
  const { user } = useAuth()
  const canReadPatients = hasPermission(user, 'patient.read')
  const canReadDoctors = hasPermission(user, 'doctor.read')
  const canReadSchedules = hasPermission(user, 'doctor_schedule.read')
  const [patientId, setPatientId] = useState(appointment?.patientId ?? '')
  const [doctorId, setDoctorId] = useState(appointment?.doctorId ?? initialDoctorId)
  const [error, setError] = useState<string | null>(null)
  const patients = usePatients(
    { page: 1, pageSize: 100 },
  )
  const doctors = useDoctors({
    page: 1,
    pageSize: 100,
    status: 'active',
    employmentStatus: 'active',
  })
  const schedules = useDoctorSchedules(
    doctorId,
    { page: 1, pageSize: 50 },
  )

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    const form = new FormData(event.currentTarget)
    const startsLocal = String(form.get('startsAt') ?? '')
    const endsLocal = String(form.get('endsAt') ?? '')
    if (!patientId) {
      setError('Select a patient.')
      return
    }
    if (!doctorId) {
      setError('Select a doctor.')
      return
    }
    if (!startsLocal || !endsLocal) {
      setError('Start and end date/time are required.')
      return
    }
    const startsAt = localDateTimeToOffsetIso(startsLocal)
    const endsAt = localDateTimeToOffsetIso(endsLocal)
    if (Date.parse(endsAt) <= Date.parse(startsAt)) {
      setError('Appointment end must be after appointment start.')
      return
    }
    const reason = String(form.get('reason') ?? '').trim() || null
    try {
      await onSubmit({
        patientId,
        doctorId,
        startsAt,
        endsAt,
        reason,
      })
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'The appointment could not be saved.',
      )
    }
  }

  return (
    <Paper sx={{ p: { xs: 2, md: 3 } }}>
      <Stack component="form" spacing={2.5} onSubmit={(event) => void handleSubmit(event)}>
        {error && <Alert severity="error">{error}</Alert>}
        <FormSection title="People">
        {lockPatient && appointment ? (
          <TextField
            disabled
            label="Patient"
            value={`${appointment.patient.firstName} ${appointment.patient.lastName} (${appointment.patient.patientNumber})`}
          />
        ) : (
          <FormControl fullWidth required>
            <InputLabel id="appointment-patient-label">Patient</InputLabel>
            <Select
              label="Patient"
              labelId="appointment-patient-label"
              onChange={(event) => setPatientId(event.target.value)}
              value={patientId}
            >
              {(patients.data?.data ?? []).map((patient) => (
                <MenuItem key={patient.id} value={patient.id}>
                  {patient.firstName} {patient.lastName} ({patient.patientNumber})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        {!canReadPatients && !lockPatient && (
          <Alert severity="warning">Patient list could not be loaded without patient.read.</Alert>
        )}
        {patients.isError && !lockPatient && (
          <Alert severity="error">Patients could not be loaded.</Alert>
        )}
        <FormControl fullWidth required>
          <InputLabel id="appointment-doctor-label">Doctor</InputLabel>
          <Select
            label="Doctor"
            labelId="appointment-doctor-label"
            onChange={(event) => setDoctorId(event.target.value)}
            value={doctorId}
          >
            {(doctors.data?.data ?? []).map((doctor) => (
              <MenuItem key={doctor.id} value={doctor.id}>
                {doctor.employee.firstName} {doctor.employee.lastName} ({doctor.specialization})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {!canReadDoctors && (
          <Alert severity="warning">Doctor list could not be loaded without doctor.read.</Alert>
        )}
        {doctors.isError && (
          <Alert severity="error">Doctors could not be loaded.</Alert>
        )}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            defaultValue={
              appointment
                ? instantToLocalInput(appointment.startsAt)
                : initialStartsAt
            }
            fullWidth
            label="Start"
            name="startsAt"
            required
            slotProps={{
              htmlInput: { 'aria-label': 'Start' },
              inputLabel: { shrink: true },
            }}
            type="datetime-local"
          />
          <TextField
            defaultValue={
              appointment
                ? instantToLocalInput(appointment.endsAt)
                : initialEndsAt
            }
            fullWidth
            label="End"
            name="endsAt"
            required
            slotProps={{
              htmlInput: { 'aria-label': 'End' },
              inputLabel: { shrink: true },
            }}
            type="datetime-local"
          />
        </Stack>
        <TextField
          defaultValue={appointment?.reason ?? ''}
          fullWidth
          label="Reason"
          multiline
          name="reason"
          slotProps={{ htmlInput: { maxLength: 1000 } }}
        />
        {doctorId && canReadSchedules && (
          <Stack spacing={1}>
            <Typography variant="subtitle1">Doctor availability</Typography>
            <Typography color="text.secondary" variant="body2">
              The appointment interval must be fully inside an available schedule.
              Unavailable and cancelled intervals cannot be used.
            </Typography>
            {schedules.isError && (
              <Alert severity="error">Schedules could not be loaded.</Alert>
            )}
            {schedules.data && schedules.data.data.length === 0 && (
              <Alert severity="info">No schedule intervals are recorded for this doctor.</Alert>
            )}
            {schedules.data && schedules.data.data.length > 0 && (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Start</TableCell>
                      <TableCell>End</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {schedules.data.data.map((schedule) => (
                      <TableRow key={schedule.id}>
                        <TableCell>{formatHospitalDateTime(schedule.startsAt)}</TableCell>
                        <TableCell>{formatHospitalDateTime(schedule.endsAt)}</TableCell>
                        <TableCell><StatusChip value={schedule.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Stack>
        )}
        </FormSection>
        <Button disabled={isPending} type="submit" variant="contained">
          {isPending ? 'Saving…' : submitLabel}
        </Button>
      </Stack>
    </Paper>
  )
}

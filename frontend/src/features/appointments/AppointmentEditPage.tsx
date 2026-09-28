import { Alert, Button, Paper, Stack, TextField } from '@mui/material'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { Page } from '../../shared/components/Page'
import { ErrorState, LoadingState } from '../../shared/components/StateViews'
import { useNotification } from '../../shared/notifications/notificationContext'
import { useAppointment, useUpdateAppointment } from './hooks'

export function AppointmentEditPage() {
  const { appointmentId = '' } = useParams()
  const appointmentQuery = useAppointment(appointmentId)
  const mutation = useUpdateAppointment(appointmentId)
  const navigate = useNavigate()
  const { notify } = useNotification()
  const [error, setError] = useState<string | null>(null)

  if (appointmentQuery.isLoading) return <LoadingState label="Loading appointment" />
  if (appointmentQuery.isError) {
    return (
      <ErrorState
        message={appointmentQuery.error instanceof ApiError ? appointmentQuery.error.message : 'Appointment could not be loaded.'}
        onRetry={() => void appointmentQuery.refetch()}
      />
    )
  }
  if (!appointmentQuery.data) return null
  const appointment = appointmentQuery.data

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    const form = new FormData(event.currentTarget)
    const reason = String(form.get('reason') ?? '').trim() || null
    try {
      await mutation.mutateAsync({ reason })
      notify('Appointment reason updated.', 'success')
      navigate(`/appointments/${appointmentId}`, { replace: true })
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'The appointment could not be updated.',
      )
    }
  }

  return (
    <Page
      title="Edit appointment reason"
      description="Patient, doctor, and times are changed only by rescheduling. Status is changed through the appointment detail actions."
      actions={<Button component={Link} to={`/appointments/${appointmentId}`}>Cancel</Button>}
    >
      <Paper sx={{ p: 3 }}>
        <Stack component="form" spacing={2.5} onSubmit={(event) => void handleSubmit(event)}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            disabled
            label="Patient"
            value={`${appointment.patient.firstName} ${appointment.patient.lastName}`}
          />
          <TextField
            disabled
            label="Doctor"
            value={`${appointment.doctor.employee.firstName} ${appointment.doctor.employee.lastName}`}
          />
          <TextField
            disabled
            label="Interval"
            value={`${new Date(appointment.startsAt).toLocaleString()} – ${new Date(appointment.endsAt).toLocaleString()}`}
          />
          <TextField
            defaultValue={appointment.reason ?? ''}
            fullWidth
            label="Reason"
            multiline
            name="reason"
            slotProps={{ htmlInput: { maxLength: 1000 } }}
          />
          <Button disabled={mutation.isPending} type="submit" variant="contained">
            {mutation.isPending ? 'Saving…' : 'Save reason'}
          </Button>
        </Stack>
      </Paper>
    </Page>
  )
}

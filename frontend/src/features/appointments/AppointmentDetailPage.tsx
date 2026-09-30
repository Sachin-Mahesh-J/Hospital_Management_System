import { formatHospitalDateTime } from '../../shared/datetime/hospitalTime'
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { Can } from '../../auth/Can'
import { Page, PageError, PageLoading } from '../../shared/components/Page'
import { formatStatusLabel } from '../../shared/components/formatStatusLabel'
import { StatusChip } from '../../shared/components/StatusChip'
import { useNotification } from '../../shared/notifications/notificationContext'
import { AppointmentForm } from './AppointmentForm'
import {
  useAppointment,
  useCancelAppointment,
  useRescheduleAppointment,
  useUpdateAppointmentStatus,
} from './hooks'
import {
  allowedStatusTransitions,
  canCancelAppointment,
  canRescheduleAppointment,
  doctorLabel,
  patientLabel,
  type AppointmentRescheduleInput,
} from './types'

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Stack spacing={0.5}>
      <Typography color="text.secondary" variant="body2">{label}</Typography>
      {typeof value === 'string' || value == null ? (
        <Typography>{value || 'Not recorded'}</Typography>
      ) : (
        value
      )}
    </Stack>
  )
}

export function AppointmentDetailPage() {
  const { appointmentId = '' } = useParams()
  return <AppointmentDetail key={appointmentId} appointmentId={appointmentId} />
}

function AppointmentDetail({ appointmentId }: { appointmentId: string }) {
  const query = useAppointment(appointmentId)
  const cancelMutation = useCancelAppointment(appointmentId)
  const statusMutation = useUpdateAppointmentStatus(appointmentId)
  const rescheduleMutation = useRescheduleAppointment(appointmentId)
  const navigate = useNavigate()
  const { notify } = useNotification()
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [showReschedule, setShowReschedule] = useState(false)

  if (query.isLoading) {
    return <PageLoading title="Appointment details" label="Loading appointment information..." />
  }
  if (query.isError) {
    return (
      <PageError
        title="Appointment details"
        message={query.error instanceof ApiError ? query.error.message : 'Appointment could not be loaded.'}
        onRetry={() => void query.refetch()}
      />
    )
  }
  if (!query.data) return null
  const appointment = query.data
  const transitions = allowedStatusTransitions[appointment.status]

  const handleCancel = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCancelError(null)
    const form = new FormData(event.currentTarget)
    const cancellationReason = String(form.get('cancellationReason') ?? '').trim()
    if (!cancellationReason) {
      setCancelError('A cancellation reason is required.')
      return
    }
    try {
      await cancelMutation.mutateAsync(cancellationReason)
      notify('Appointment cancelled.', 'success')
      setCancelOpen(false)
    } catch (caught) {
      setCancelError(
        caught instanceof ApiError
          ? caught.message
          : 'The appointment could not be cancelled.',
      )
    }
  }

  return (
    <Page
      help="Cancellation keeps history with a required reason. Rescheduling cancels the original and creates a linked replacement appointment for the same patient."
      helpLabel="Cancelling and rescheduling appointments"
      title={`${patientLabel(appointment.patient)} with ${doctorLabel(appointment.doctor)}`}
      description={formatStatusLabel(appointment.status)}
      actions={
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
          <Button component={Link} to="/appointments">Back to appointments</Button>
          <Can permission="appointment.update">
            <Button component={Link} to={`/appointments/${appointment.id}/edit`}>
              Edit reason
            </Button>
          </Can>
        </Stack>
      }
    >
      <Paper sx={{ p: 3 }}>
        <Stack spacing={2.5}>
          <Typography component="h2" variant="h6">Appointment</Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={4}>
            <Detail label="Status" value={<StatusChip value={appointment.status} />} />
            <Detail label="Start" value={formatHospitalDateTime(appointment.startsAt)} />
            <Detail label="End" value={formatHospitalDateTime(appointment.endsAt)} />
          </Stack>
          <Divider />
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={4}>
            <Detail label="Patient" value={patientLabel(appointment.patient)} />
            <Detail label="Doctor" value={`${doctorLabel(appointment.doctor)} (${appointment.doctor.specialization})`} />
          </Stack>
          <Detail label="Reason" value={appointment.reason} />
          <Detail label="Booked by" value={appointment.createdBy.username} />
        </Stack>
      </Paper>

      {appointment.status === 'cancelled' && (
        <Paper sx={{ p: 3 }}>
          <Typography component="h2" variant="h6" gutterBottom>Cancellation</Typography>
          <Stack spacing={2}>
            <Detail label="Reason" value={appointment.cancellationReason} />
            <Detail
              label="Cancelled at"
              value={appointment.cancelledAt ? formatHospitalDateTime(appointment.cancelledAt) : null}
            />
            <Detail label="Cancelled by" value={appointment.cancelledBy?.username ?? null} />
          </Stack>
        </Paper>
      )}

      {(appointment.rescheduledFrom || appointment.rescheduledTo) && (
        <Paper sx={{ p: 3 }}>
          <Typography component="h2" variant="h6" gutterBottom>Rescheduling relationship</Typography>
          <Stack spacing={2}>
            {appointment.rescheduledFrom && (
              <Stack spacing={1}>
                <Typography color="text.secondary" variant="body2">Original appointment</Typography>
                <Button
                  component={Link}
                  sx={{ alignSelf: 'flex-start' }}
                  to={`/appointments/${appointment.rescheduledFrom.id}`}
                >
                  View original ({appointment.rescheduledFrom.status})
                </Button>
              </Stack>
            )}
            {appointment.rescheduledTo && (
              <Stack spacing={1}>
                <Typography color="text.secondary" variant="body2">Replacement appointment</Typography>
                <Button
                  component={Link}
                  sx={{ alignSelf: 'flex-start' }}
                  to={`/appointments/${appointment.rescheduledTo.id}`}
                >
                  View replacement ({appointment.rescheduledTo.status})
                </Button>
              </Stack>
            )}
          </Stack>
        </Paper>
      )}

      {statusError && <Alert severity="error">{statusError}</Alert>}
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
        <Can permission="appointment.status.update">
          {transitions.map((status) => (
            <Button
              disabled={statusMutation.isPending}
              key={status}
              onClick={() => {
                setStatusError(null)
                void statusMutation.mutateAsync(status).then(() => {
                  notify(`Appointment marked ${status.replace('_', ' ')}.`, 'success')
                }).catch((caught: unknown) => {
                  setStatusError(
                    caught instanceof ApiError
                      ? caught.message
                      : 'The appointment status could not be updated.',
                  )
                })
              }}
              variant="outlined"
            >
              Mark {formatStatusLabel(status)}
            </Button>
          ))}
        </Can>
        <Can permission="appointment.cancel">
          {canCancelAppointment(appointment.status) && (
            <Button
              color="error"
              onClick={() => { setCancelOpen(true); setCancelError(null) }}
              variant="outlined"
            >
              Cancel appointment
            </Button>
          )}
        </Can>
        <Can permission="appointment.reschedule">
          {canRescheduleAppointment(appointment.status) && (
            <Button
              onClick={() => setShowReschedule((value) => !value)}
              variant={showReschedule ? 'text' : 'contained'}
            >
              {showReschedule ? 'Hide replacement form' : 'Reschedule'}
            </Button>
          )}
        </Can>
      </Stack>

      {showReschedule && canRescheduleAppointment(appointment.status) && (
        <Stack spacing={1}>
          <Alert severity="info">
            The original appointment is kept as cancelled history. The form below creates the
            replacement appointment for the same patient.
          </Alert>
          <Typography variant="subtitle1">Replacement appointment</Typography>
          <AppointmentForm
            appointment={appointment}
            isPending={rescheduleMutation.isPending}
            lockPatient
            onSubmit={async (input) => {
              const replacement = await rescheduleMutation.mutateAsync(
                input as AppointmentRescheduleInput,
              )
              notify('Appointment rescheduled.', 'success')
              navigate(`/appointments/${replacement.id}`, { replace: true })
            }}
            submitLabel="Create replacement"
          />
        </Stack>
      )}

      <Dialog onClose={() => setCancelOpen(false)} open={cancelOpen}>
        <DialogTitle>Cancel appointment</DialogTitle>
        <Stack component="form" onSubmit={(event) => void handleCancel(event)}>
          <DialogContent>
            <Stack spacing={2}>
              {cancelError && <Alert severity="error">{cancelError}</Alert>}
              <Typography>
                The appointment will be marked cancelled and kept on file. It will no longer
                occupy an active slot.
              </Typography>
              <TextField
                autoFocus
                fullWidth
                label="Cancellation reason"
                name="cancellationReason"
                required
                slotProps={{ htmlInput: { maxLength: 500, 'aria-label': 'Cancellation reason' } }}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCancelOpen(false)}>Keep appointment</Button>
            <Button
              color="warning"
              disabled={cancelMutation.isPending}
              type="submit"
              variant="contained"
            >
              {cancelMutation.isPending ? 'Cancelling…' : 'Confirm cancellation'}
            </Button>
          </DialogActions>
        </Stack>
      </Dialog>
    </Page>
  )
}

import { Button } from '@mui/material'
import { Link, useNavigate } from 'react-router-dom'
import { Page } from '../../shared/components/Page'
import { useNotification } from '../../shared/notifications/notificationContext'
import { AppointmentForm } from './AppointmentForm'
import { useCreateAppointment } from './hooks'
import type { AppointmentInput } from './types'

export function AppointmentCreatePage() {
  const mutation = useCreateAppointment()
  const navigate = useNavigate()
  const { notify } = useNotification()

  return (
    <Page
      title="Book appointment"
      description="Collect explicit start and end times. There is no default duration. The server validates schedule fit and conflicts."
      actions={<Button component={Link} to="/appointments">Cancel</Button>}
    >
      <AppointmentForm
        isPending={mutation.isPending}
        onSubmit={async (input) => {
          const appointment = await mutation.mutateAsync(input as AppointmentInput)
          notify('Appointment booked successfully.', 'success')
          navigate(`/appointments/${appointment.id}`, { replace: true })
        }}
        submitLabel="Book appointment"
      />
    </Page>
  )
}

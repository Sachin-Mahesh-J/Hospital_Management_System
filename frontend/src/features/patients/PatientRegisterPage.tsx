import { Button } from '@mui/material'
import { Link, useNavigate } from 'react-router-dom'
import { Page } from '../../shared/components/Page'
import { useNotification } from '../../shared/notifications/notificationContext'
import { useCreatePatient } from './hooks'
import { PatientForm } from './PatientForm'
import type { PatientInput } from './types'

export function PatientRegisterPage() {
  const mutation = useCreatePatient()
  const navigate = useNavigate()
  const { notify } = useNotification()

  return (
    <Page
      title="Register patient"
      description="Create a patient demographic record. A unique patient number is assigned automatically."
      actions={<Button component={Link} to="/patients">Cancel</Button>}
    >
      <PatientForm
        isPending={mutation.isPending}
        onSubmit={async (input) => {
          const patient = await mutation.mutateAsync(input as PatientInput)
          notify('Patient registered successfully.', 'success')
          navigate(`/patients/${patient.id}`, { replace: true })
        }}
        submitLabel="Register patient"
      />
    </Page>
  )
}

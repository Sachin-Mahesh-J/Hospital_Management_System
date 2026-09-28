import { Button } from '@mui/material'
import { Link, useNavigate } from 'react-router-dom'
import { Page } from '../../shared/components/Page'
import { useNotification } from '../../shared/notifications/notificationContext'
import { DoctorForm } from './DoctorForm'
import { useCreateDoctor } from './hooks'
import type { DoctorInput } from './types'

export function DoctorCreatePage() {
  const mutation = useCreateDoctor()
  const navigate = useNavigate()
  const { notify } = useNotification()

  return (
    <Page
      title="Create doctor profile"
      description="Link professional doctor data to an existing employee. This does not create a second person record."
      actions={<Button component={Link} to="/doctors">Cancel</Button>}
    >
      <DoctorForm
        isPending={mutation.isPending}
        onSubmit={async (input) => {
          const doctor = await mutation.mutateAsync(input as DoctorInput)
          notify('Doctor profile created successfully.', 'success')
          navigate(`/doctors/${doctor.id}`, { replace: true })
        }}
        submitLabel="Create doctor profile"
      />
    </Page>
  )
}

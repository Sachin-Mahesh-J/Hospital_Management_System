import { Button } from '@mui/material'
import { Link, useNavigate } from 'react-router-dom'
import { Page } from '../../shared/components/Page'
import { useNotification } from '../../shared/notifications/notificationContext'
import { AdmissionForm } from './AdmissionForm'
import { useCreateAdmission } from './hooks'

export function AdmissionCreatePage() {
  const mutation = useCreateAdmission()
  const navigate = useNavigate()
  const { notify } = useNotification()

  return (
    <Page
      title="Register admission"
      description="Create a minimal inpatient admission. The server assigns the admission number, status, and admission time."
      actions={<Button component={Link} to="/admissions">Cancel</Button>}
    >
      <AdmissionForm
        isPending={mutation.isPending}
        onSubmit={async (input) => {
          const admission = await mutation.mutateAsync(input)
          notify('Admission registered successfully.', 'success')
          navigate(`/admissions/${admission.id}`, { replace: true })
        }}
      />
    </Page>
  )
}

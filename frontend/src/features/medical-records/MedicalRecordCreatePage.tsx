import { Button } from '@mui/material'
import { Link, useNavigate } from 'react-router-dom'
import { Page } from '../../shared/components/Page'
import { useNotification } from '../../shared/notifications/notificationContext'
import { MedicalRecordForm } from './MedicalRecordForm'
import { useCreateMedicalRecord } from './hooks'
import type { MedicalRecordInput } from './types'

export function MedicalRecordCreatePage() {
  const mutation = useCreateMedicalRecord()
  const navigate = useNavigate()
  const { notify } = useNotification()

  return (
    <Page
      title="New medical record"
      description="The author is the employee linked to your account. The record starts as a draft."
      actions={<Button component={Link} to="/medical-records">Cancel</Button>}
    >
      <MedicalRecordForm
        isPending={mutation.isPending}
        mode="create"
        onSubmit={async (input) => {
          const record = await mutation.mutateAsync(input as MedicalRecordInput)
          notify('Draft medical record created.', 'success')
          navigate(`/medical-records/${record.id}`, { replace: true })
        }}
        submitLabel="Create draft"
      />
    </Page>
  )
}

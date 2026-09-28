import { Button } from '@mui/material'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { Page } from '../../shared/components/Page'
import { ErrorState, LoadingState } from '../../shared/components/StateViews'
import { useNotification } from '../../shared/notifications/notificationContext'
import { MedicalRecordForm } from './MedicalRecordForm'
import { useMedicalRecord, useUpdateMedicalRecord } from './hooks'
import type { MedicalRecordUpdate } from './types'

export function MedicalRecordEditPage() {
  const { medicalRecordId = '' } = useParams()
  const query = useMedicalRecord(medicalRecordId)
  const mutation = useUpdateMedicalRecord(medicalRecordId)
  const navigate = useNavigate()
  const { notify } = useNotification()

  if (query.isLoading) return <LoadingState label="Loading medical record" />
  if (query.isError) {
    return (
      <ErrorState
        message={query.error instanceof ApiError ? query.error.message : 'Medical record could not be loaded.'}
        onRetry={() => void query.refetch()}
      />
    )
  }
  if (!query.data) return null

  return (
    <Page
      title="Edit draft medical record"
      description="Patient and author cannot be changed. Finalized records must be amended instead."
      actions={<Button component={Link} to={`/medical-records/${medicalRecordId}`}>Cancel</Button>}
    >
      <MedicalRecordForm
        isPending={mutation.isPending}
        mode="edit"
        onSubmit={async (input) => {
          await mutation.mutateAsync(input as MedicalRecordUpdate)
          notify('Draft medical record updated.', 'success')
          navigate(`/medical-records/${medicalRecordId}`, { replace: true })
        }}
        record={query.data}
        submitLabel="Save draft"
      />
    </Page>
  )
}

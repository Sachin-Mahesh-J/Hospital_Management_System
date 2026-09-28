import { Button } from '@mui/material'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { Page } from '../../shared/components/Page'
import { ErrorState, LoadingState } from '../../shared/components/StateViews'
import { useNotification } from '../../shared/notifications/notificationContext'
import { MedicalRecordForm } from './MedicalRecordForm'
import { useAmendMedicalRecord, useMedicalRecord } from './hooks'
import type { MedicalRecordAmendment } from './types'

export function MedicalRecordAmendPage() {
  const { medicalRecordId = '' } = useParams()
  const query = useMedicalRecord(medicalRecordId)
  const mutation = useAmendMedicalRecord(medicalRecordId)
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
      title="Amend medical record"
      description="The original finalized record is kept unchanged. A new finalized successor is created."
      actions={<Button component={Link} to={`/medical-records/${medicalRecordId}`}>Cancel</Button>}
    >
      <MedicalRecordForm
        isPending={mutation.isPending}
        mode="amend"
        onSubmit={async (input) => {
          const successor = await mutation.mutateAsync(input as MedicalRecordAmendment)
          notify('Medical record amended.', 'success')
          navigate(`/medical-records/${successor.id}`, { replace: true })
        }}
        record={query.data}
        submitLabel="Create amendment"
      />
    </Page>
  )
}

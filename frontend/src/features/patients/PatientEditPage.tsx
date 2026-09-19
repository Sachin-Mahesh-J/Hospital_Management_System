import { Button } from '@mui/material'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { Page } from '../../shared/components/Page'
import { ErrorState, LoadingState } from '../../shared/components/StateViews'
import { useNotification } from '../../shared/notifications/notificationContext'
import { usePatient, useUpdatePatient } from './hooks'
import { PatientForm } from './PatientForm'
import type { PatientUpdate } from './types'

export function PatientEditPage() {
  const { patientId = '' } = useParams()
  const patientQuery = usePatient(patientId)
  const mutation = useUpdatePatient(patientId)
  const navigate = useNavigate()
  const { notify } = useNotification()

  if (patientQuery.isLoading) return <LoadingState label="Loading patient" />
  if (patientQuery.isError) {
    return (
      <ErrorState
        message={patientQuery.error instanceof ApiError ? patientQuery.error.message : 'Patient could not be loaded.'}
        onRetry={() => void patientQuery.refetch()}
      />
    )
  }
  if (!patientQuery.data) return null

  return (
    <Page
      title="Edit patient"
      description={`${patientQuery.data.patientNumber} — ${patientQuery.data.firstName} ${patientQuery.data.lastName}`}
      actions={<Button component={Link} to={`/patients/${patientId}`}>Cancel</Button>}
    >
      <PatientForm
        allowStatus
        isPending={mutation.isPending}
        onSubmit={async (input) => {
          await mutation.mutateAsync(input as PatientUpdate)
          notify('Patient updated successfully.', 'success')
          navigate(`/patients/${patientId}`, { replace: true })
        }}
        patient={patientQuery.data}
        submitLabel="Save changes"
      />
    </Page>
  )
}

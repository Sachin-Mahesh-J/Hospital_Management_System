import { Button } from '@mui/material'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { Page } from '../../shared/components/Page'
import { ErrorState, LoadingState } from '../../shared/components/StateViews'
import { useNotification } from '../../shared/notifications/notificationContext'
import { DoctorForm } from './DoctorForm'
import { useDoctor, useUpdateDoctor } from './hooks'
import type { DoctorUpdate } from './types'

export function DoctorEditPage() {
  const { doctorId = '' } = useParams()
  const doctorQuery = useDoctor(doctorId)
  const mutation = useUpdateDoctor(doctorId)
  const navigate = useNavigate()
  const { notify } = useNotification()

  if (doctorQuery.isLoading) return <LoadingState label="Loading doctor" />
  if (doctorQuery.isError) {
    return (
      <ErrorState
        message={doctorQuery.error instanceof ApiError ? doctorQuery.error.message : 'Doctor could not be loaded.'}
        onRetry={() => void doctorQuery.refetch()}
      />
    )
  }
  if (!doctorQuery.data) return null

  return (
    <Page
      title="Edit doctor profile"
      description={`${doctorQuery.data.employee.firstName} ${doctorQuery.data.employee.lastName}`}
      actions={<Button component={Link} to={`/doctors/${doctorId}`}>Cancel</Button>}
    >
      <DoctorForm
        allowStatus
        doctor={doctorQuery.data}
        isPending={mutation.isPending}
        onSubmit={async (input) => {
          await mutation.mutateAsync(input as DoctorUpdate)
          notify('Doctor profile updated successfully.', 'success')
          navigate(`/doctors/${doctorId}`, { replace: true })
        }}
        submitLabel="Save changes"
      />
    </Page>
  )
}

import { Button } from '@mui/material'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { Page, PageError, PageLoading } from '../../shared/components/Page'
import { useNotification } from '../../shared/notifications/notificationContext'
import { MedicineForm } from './MedicineForm'
import { useMedicine, useUpdateMedicine } from './hooks'
import type { MedicineUpdate } from './types'

export function MedicineEditPage() {
  const { medicineId = '' } = useParams()
  const medicineQuery = useMedicine(medicineId)
  const mutation = useUpdateMedicine(medicineId)
  const navigate = useNavigate()
  const { notify } = useNotification()

  if (medicineQuery.isLoading) {
    return <PageLoading title="Edit medicine" label="Loading medicine information..." />
  }
  if (medicineQuery.isError) {
    return (
      <PageError
        title="Edit medicine"
        message={medicineQuery.error instanceof ApiError ? medicineQuery.error.message : 'Medicine could not be loaded.'}
        onRetry={() => void medicineQuery.refetch()}
      />
    )
  }
  if (!medicineQuery.data) return null

  return (
    <Page
      title="Edit medicine"
      description={`${medicineQuery.data.code} — ${medicineQuery.data.genericName}. Catalogue edits do not change historical prescriptions, batches, or invoices.`}
      actions={<Button component={Link} to={`/medicines/${medicineId}`}>Cancel</Button>}
    >
      <MedicineForm
        medicine={medicineQuery.data}
        isPending={mutation.isPending}
        onSubmit={async (input) => {
          await mutation.mutateAsync(input as MedicineUpdate)
          notify('Medicine updated successfully.', 'success')
          navigate(`/medicines/${medicineId}`, { replace: true })
        }}
        submitLabel="Save changes"
      />
    </Page>
  )
}

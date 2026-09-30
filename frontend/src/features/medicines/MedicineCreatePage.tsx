import { Button } from '@mui/material'
import { Link, useNavigate } from 'react-router-dom'
import { Page } from '../../shared/components/Page'
import { useNotification } from '../../shared/notifications/notificationContext'
import { MedicineForm } from './MedicineForm'
import { useCreateMedicine } from './hooks'
import type { MedicineInput } from './types'

export function MedicineCreatePage() {
  const mutation = useCreateMedicine()
  const navigate = useNavigate()
  const { notify } = useNotification()

  return (
    <Page
      title="Create medicine"
      description="Add a medicine to the catalogue. Physical stock is received separately by pharmacy."
      actions={<Button component={Link} to="/medicines">Cancel</Button>}
    >
      <MedicineForm
        isPending={mutation.isPending}
        onSubmit={async (input) => {
          const medicine = await mutation.mutateAsync(input as MedicineInput)
          notify('Medicine created successfully.', 'success')
          navigate(`/medicines/${medicine.id}`, { replace: true })
        }}
        submitLabel="Create medicine"
      />
    </Page>
  )
}

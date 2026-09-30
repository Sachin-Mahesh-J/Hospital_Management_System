import { Button, Paper, Stack, Typography } from '@mui/material'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { Can } from '../../auth/Can'
import { ConfirmDialog } from '../../shared/components/ConfirmDialog'
import { Page, PageError, PageLoading } from '../../shared/components/Page'
import { StatusChip } from '../../shared/components/StatusChip'
import { useNotification } from '../../shared/notifications/notificationContext'
import { useDeactivateMedicine, useMedicine, useReactivateMedicine } from './hooks'

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <Stack spacing={0.5}>
      <Typography color="text.secondary" variant="body2">{label}</Typography>
      <Typography>{value || 'Not recorded'}</Typography>
    </Stack>
  )
}

export function MedicineDetailPage() {
  const { medicineId = '' } = useParams()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const query = useMedicine(medicineId)
  const deactivate = useDeactivateMedicine()
  const reactivate = useReactivateMedicine()
  const { notify } = useNotification()

  if (query.isLoading) {
    return <PageLoading title="Medicine" label="Loading medicine information..." />
  }
  if (query.isError) {
    return (
      <PageError
        title="Medicine"
        message={query.error instanceof ApiError ? query.error.message : 'Medicine could not be loaded.'}
        onRetry={() => void query.refetch()}
      />
    )
  }
  if (!query.data) return null
  const medicine = query.data
  const pending = deactivate.isPending || reactivate.isPending

  const handleLifecycle = async () => {
    try {
      if (medicine.status === 'active') {
        await deactivate.mutateAsync(medicine.id)
        notify('Medicine deactivated.', 'success')
      } else {
        await reactivate.mutateAsync(medicine.id)
        notify('Medicine reactivated.', 'success')
      }
    } catch (caught) {
      notify(
        caught instanceof ApiError ? caught.message : 'The medicine status could not be changed.',
        'error',
      )
    }
  }

  return (
    <Page
      help="Deactivation blocks new prescriptions, receiving, and dispensing for this medicine. Reactivation restores selection. Catalogue history is retained."
      helpLabel="Medicine deactivation"
      title={medicine.genericName}
      description={medicine.code}
      actions={
        <Stack direction="row" spacing={1}>
          <Button component={Link} to="/medicines">Back to medicines</Button>
          <Can permission="medicine.update">
            <Button component={Link} to={`/medicines/${medicine.id}/edit`} variant="contained">
              Edit medicine
            </Button>
          </Can>
          <Can permission={medicine.status === 'active' ? 'medicine.deactivate' : 'medicine.reactivate'}>
            <Button
              color={medicine.status === 'active' ? 'warning' : 'primary'}
              disabled={pending}
              onClick={() => setConfirmOpen(true)}
              variant="outlined"
            >
              {medicine.status === 'active' ? 'Deactivate' : 'Reactivate'}
            </Button>
          </Can>
        </Stack>
      }
    >
      <Paper sx={{ p: 3 }}>
        <Stack spacing={2.5}>
          <Stack spacing={0.5}>
            <Typography color="text.secondary" variant="body2">Status</Typography>
            <StatusChip value={medicine.status} />
          </Stack>
          <Detail label="Brand name" value={medicine.brandName} />
          <Detail label="Dosage form" value={medicine.dosageForm} />
          <Detail label="Strength" value={medicine.strength} />
          <Detail label="Inventory unit" value={medicine.inventoryUnit} />
          <Detail label="Currency" value={medicine.currency} />
          <Detail label="Default sale price" value={medicine.defaultSalePrice} />
          <Detail label="Low-stock threshold" value={medicine.lowStockThreshold} />
        </Stack>
      </Paper>
      <ConfirmDialog
        confirmColor={medicine.status === 'active' ? 'warning' : 'primary'}
        confirmLabel={medicine.status === 'active' ? 'Deactivate medicine' : 'Reactivate medicine'}
        description={
          medicine.status === 'active'
            ? 'Deactivation prevents this medicine from being selected for new prescriptions, stock receiving, and dispensing. Historical records remain available.'
            : 'Reactivation allows this medicine to be selected again for new prescriptions, receiving, and dispensing.'
        }
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false)
          void handleLifecycle()
        }}
        open={confirmOpen}
        pending={pending}
        title={medicine.status === 'active' ? 'Deactivate medicine?' : 'Reactivate medicine?'}
      />
    </Page>
  )
}

import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { Can } from '../../auth/Can'
import { Page } from '../../shared/components/Page'
import { ErrorState, LoadingState } from '../../shared/components/StateViews'
import { useNotification } from '../../shared/notifications/notificationContext'
import { useCancelPrescription, usePrescription } from './hooks'
import { canCancelPrescription, medicineLabel } from './types'

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <Stack spacing={0.5}>
      <Typography color="text.secondary" variant="body2">{label}</Typography>
      <Typography>{value || 'Not recorded'}</Typography>
    </Stack>
  )
}

export function PrescriptionDetailPage() {
  const { prescriptionId = '' } = useParams()
  const query = usePrescription(prescriptionId)
  const cancel = useCancelPrescription(prescriptionId)
  const { notify } = useNotification()
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)

  if (query.isLoading) return <LoadingState label="Loading prescription" />
  if (query.isError) {
    return (
      <ErrorState
        message={query.error instanceof ApiError ? query.error.message : 'Prescription could not be loaded.'}
        onRetry={() => void query.refetch()}
      />
    )
  }
  if (!query.data) return null
  const prescription = query.data

  const handleCancel = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCancelError(null)
    const form = new FormData(event.currentTarget)
    const cancellationReason = String(form.get('cancellationReason') ?? '').trim()
    if (!cancellationReason) {
      setCancelError('A cancellation reason is required.')
      return
    }
    try {
      await cancel.mutateAsync(cancellationReason)
      notify('Prescription cancelled.', 'success')
      setCancelOpen(false)
    } catch (caught) {
      setCancelError(
        caught instanceof ApiError
          ? caught.message
          : 'The prescription could not be cancelled.',
      )
    }
  }

  return (
    <Page
      title={`Prescription (${prescription.status})`}
      description={`${prescription.patient.firstName} ${prescription.patient.lastName}`}
      actions={
        <Stack direction="row" spacing={1}>
          <Button component={Link} to={`/medical-records/${prescription.medicalRecordId}`}>
            Back to medical record
          </Button>
          <Button component={Link} to="/prescriptions">All prescriptions</Button>
        </Stack>
      }
    >
      <Paper sx={{ p: 3 }}>
        <Stack spacing={2.5}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={4}>
            <Detail label="Status" value={prescription.status} />
            <Detail label="Prescribed" value={new Date(prescription.prescribedAt).toLocaleString()} />
          </Stack>
          <Divider />
          <Detail
            label="Prescribed by"
            value={`${prescription.prescribedBy.employee.firstName} ${prescription.prescribedBy.employee.lastName}`}
          />
          <Detail label="Notes" value={prescription.notes} />
        </Stack>
      </Paper>
      {prescription.items.map((item) => (
        <Paper key={item.id} sx={{ p: 3 }}>
          <Typography component="h2" variant="h6" gutterBottom>
            {medicineLabel(item.medicine)}
          </Typography>
          <Stack spacing={1}>
            <Detail label="Dosage" value={item.dosage} />
            <Detail label="Route" value={item.route} />
            <Detail label="Frequency" value={item.frequency} />
            <Detail label="Duration" value={item.duration} />
            <Detail label="Quantity" value={`${item.quantityPrescribed} ${item.unit}`} />
            <Detail label="Instructions" value={item.instructions} />
          </Stack>
        </Paper>
      ))}
      <Can permission="prescription.cancel">
        {canCancelPrescription(prescription.status) && (
          <Button color="warning" onClick={() => { setCancelOpen(true); setCancelError(null) }}>
            Cancel prescription
          </Button>
        )}
      </Can>
      <Dialog onClose={() => setCancelOpen(false)} open={cancelOpen}>
        <DialogTitle>Cancel prescription</DialogTitle>
        <Stack component="form" onSubmit={(event) => void handleCancel(event)}>
          <DialogContent>
            <Stack spacing={2}>
              {cancelError && <Alert severity="error">{cancelError}</Alert>}
              <Typography>
                The prescription remains on file. Dispensing states are not changed here.
              </Typography>
              <TextField
                autoFocus
                fullWidth
                label="Cancellation reason"
                name="cancellationReason"
                required
                slotProps={{ htmlInput: { maxLength: 500, 'aria-label': 'Cancellation reason' } }}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCancelOpen(false)}>Keep prescription</Button>
            <Button
              color="warning"
              disabled={cancel.isPending}
              type="submit"
              variant="contained"
            >
              {cancel.isPending ? 'Cancelling…' : 'Confirm cancellation'}
            </Button>
          </DialogActions>
        </Stack>
      </Dialog>
    </Page>
  )
}

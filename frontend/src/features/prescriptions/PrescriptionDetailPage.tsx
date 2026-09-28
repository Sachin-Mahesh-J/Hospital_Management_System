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
import {
  useCancelPrescription,
  useDispensePrescriptionItem,
  usePrescription,
  useReverseDispense,
} from './hooks'
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
  const dispense = useDispensePrescriptionItem(prescriptionId)
  const reverse = useReverseDispense(prescriptionId)
  const { notify } = useNotification()
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [dispenseError, setDispenseError] = useState<string | null>(null)
  const [reverseOpen, setReverseOpen] = useState<string | null>(null)
  const [reverseError, setReverseError] = useState<string | null>(null)

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
  const canDispenseStatus =
    prescription.status === 'active' || prescription.status === 'partially_dispensed'

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

  const handleDispense = async (
    event: FormEvent<HTMLFormElement>,
    itemId: string,
  ) => {
    event.preventDefault()
    setDispenseError(null)
    const form = new FormData(event.currentTarget)
    const quantity = String(form.get('quantity') ?? '').trim()
    const note = String(form.get('note') ?? '').trim()
    try {
      await dispense.mutateAsync({
        itemId,
        quantity,
        note: note || null,
      })
      notify('Medicine dispensed.', 'success')
      event.currentTarget.reset()
    } catch (caught) {
      setDispenseError(
        caught instanceof ApiError
          ? caught.message
          : 'The medicine could not be dispensed.',
      )
    }
  }

  const handleReverse = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!reverseOpen) return
    setReverseError(null)
    const form = new FormData(event.currentTarget)
    const reason = String(form.get('reason') ?? '').trim()
    if (!reason) {
      setReverseError('A reversal reason is required.')
      return
    }
    try {
      await reverse.mutateAsync({ dispenseId: reverseOpen, reason })
      notify('Dispense reversed.', 'success')
      setReverseOpen(null)
    } catch (caught) {
      setReverseError(
        caught instanceof ApiError
          ? caught.message
          : 'The dispense could not be reversed.',
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
      {dispenseError && <Alert severity="error">{dispenseError}</Alert>}
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
            <Detail label="Prescribed" value={`${item.quantityPrescribed} ${item.unit}`} />
            <Detail label="Dispensed" value={`${item.quantityDispensed} ${item.unit}`} />
            <Detail label="Remaining" value={`${item.quantityRemaining} ${item.unit}`} />
            <Detail label="Instructions" value={item.instructions} />
          </Stack>
          {item.dispenseRecords.map((record) => (
            <Stack key={record.id} spacing={0.5} sx={{ mt: 2 }}>
              <Typography variant="body2">
                Dispensed {record.quantityDispensed} {record.unit} on {new Date(record.dispensedAt).toLocaleString()}
                {record.reversed ? ' (reversed)' : ''}
              </Typography>
              <Can permission="prescription.reverse">
                {!record.reversed && (
                  <Button
                    onClick={() => {
                      setReverseOpen(record.id)
                      setReverseError(null)
                    }}
                    size="small"
                  >
                    Reverse dispense
                  </Button>
                )}
              </Can>
            </Stack>
          ))}
          <Can permission="prescription.dispense">
            {canDispenseStatus && Number(item.quantityRemaining) > 0 && (
              <Stack
                component="form"
                onSubmit={(event) => void handleDispense(event, item.id)}
                spacing={1.5}
                sx={{ mt: 2 }}
              >
                <TextField
                  label="Dispense quantity"
                  name="quantity"
                  required
                  slotProps={{ htmlInput: { 'aria-label': `Dispense quantity for ${item.medicine.genericName}` } }}
                />
                <TextField
                  label="Note"
                  name="note"
                  slotProps={{ htmlInput: { maxLength: 500, 'aria-label': 'Dispense note' } }}
                />
                <Button disabled={dispense.isPending} type="submit" variant="contained">
                  Dispense
                </Button>
              </Stack>
            )}
          </Can>
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
                Only active prescriptions can be cancelled. Pharmacy reversal is a separate operation.
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
      <Dialog onClose={() => setReverseOpen(null)} open={Boolean(reverseOpen)}>
        <DialogTitle>Reverse dispense</DialogTitle>
        <Stack component="form" onSubmit={(event) => void handleReverse(event)}>
          <DialogContent>
            <Stack spacing={2}>
              {reverseError && <Alert severity="error">{reverseError}</Alert>}
              <Typography>
                This reverses the complete dispense and restores stock. Invoices and payments are not reversed.
              </Typography>
              <TextField
                autoFocus
                fullWidth
                label="Reversal reason"
                name="reason"
                required
                slotProps={{ htmlInput: { maxLength: 500, 'aria-label': 'Reversal reason' } }}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setReverseOpen(null)}>Keep dispense</Button>
            <Button
              color="warning"
              disabled={reverse.isPending}
              type="submit"
              variant="contained"
            >
              {reverse.isPending ? 'Reversing…' : 'Confirm reversal'}
            </Button>
          </DialogActions>
        </Stack>
      </Dialog>
    </Page>
  )
}

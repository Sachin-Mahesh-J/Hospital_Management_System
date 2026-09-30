import {
  Alert,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
} from '@mui/material'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { FormSection } from '../../shared/components/FormSection'
import { Page } from '../../shared/components/Page'
import { useNotification } from '../../shared/notifications/notificationContext'
import { useMedicines } from '../prescriptions/hooks'
import { medicineLabel as catalogLabel } from '../prescriptions/types'
import { useReceiveStock } from './hooks'

export function StockReceivePage() {
  const medicines = useMedicines({ page: 1, pageSize: 100, status: 'active' })
  const mutation = useReceiveStock()
  const navigate = useNavigate()
  const { notify } = useNotification()
  const [medicineId, setMedicineId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const selected = medicines.data?.data.find((medicine) => medicine.id === medicineId)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (!medicineId) {
      setError('Select a medicine.')
      return
    }
    const form = new FormData(event.currentTarget)
    try {
      await mutation.mutateAsync({
        medicineId,
        batchNumber: String(form.get('batchNumber') ?? '').trim(),
        expiryDate: String(form.get('expiryDate') ?? '').trim(),
        quantity: String(form.get('quantity') ?? '').trim(),
        unitCost: String(form.get('unitCost') ?? '').trim(),
        salePriceSnapshot: String(form.get('salePriceSnapshot') ?? '').trim(),
        currency: String(form.get('currency') ?? selected?.currency ?? '').trim().toUpperCase(),
      })
      notify('Stock received.', 'success')
      navigate('/pharmacy/inventory', { replace: true })
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'The stock receipt could not be recorded.',
      )
    }
  }

  return (
    <Page
      help="Receiving creates a new batch. Duplicate batch numbers for the same medicine are rejected. Inactive medicines cannot be received."
      helpLabel="Stock receiving"
      title="Receive stock"
      description="Record a new pharmacy batch into inventory."
      actions={<Button component={Link} to="/pharmacy/inventory">Cancel</Button>}
    >
      <Paper sx={{ p: 3 }}>
        <Stack component="form" spacing={3} onSubmit={(event) => void handleSubmit(event)}>
          {error && <Alert severity="error">{error}</Alert>}
          <FormSection title="Medicine">
            <FormControl fullWidth required>
              <InputLabel id="receive-medicine">Medicine</InputLabel>
              <Select
                label="Medicine"
                labelId="receive-medicine"
                onChange={(event) => setMedicineId(event.target.value)}
                value={medicineId}
              >
                {(medicines.data?.data ?? []).map((medicine) => (
                  <MenuItem key={medicine.id} value={medicine.id}>
                    {catalogLabel(medicine)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </FormSection>
          <FormSection title="Batch">
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  fullWidth
                  label="Batch number"
                  name="batchNumber"
                  required
                  slotProps={{ htmlInput: { maxLength: 100, 'aria-label': 'Batch number' } }}
                />
                <TextField
                  fullWidth
                  label="Expiry date"
                  name="expiryDate"
                  required
                  type="date"
                  slotProps={{
                    inputLabel: { shrink: true },
                    htmlInput: { 'aria-label': 'Expiry date' },
                  }}
                />
              </Stack>
              <TextField
                label="Quantity"
                name="quantity"
                required
                slotProps={{ htmlInput: { 'aria-label': 'Quantity' } }}
              />
            </Stack>
          </FormSection>
          <FormSection title="Pricing">
            <Stack spacing={2}>
              <TextField
                defaultValue={selected?.currency ?? ''}
                key={selected?.currency ?? 'currency'}
                label="Currency"
                name="currency"
                required
                slotProps={{ htmlInput: { maxLength: 3, 'aria-label': 'Currency' } }}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  fullWidth
                  label="Unit cost"
                  name="unitCost"
                  required
                  slotProps={{ htmlInput: { 'aria-label': 'Unit cost' } }}
                />
                <TextField
                  fullWidth
                  label="Sale price snapshot"
                  name="salePriceSnapshot"
                  required
                  slotProps={{ htmlInput: { 'aria-label': 'Sale price snapshot' } }}
                />
              </Stack>
            </Stack>
          </FormSection>
          <Button disabled={mutation.isPending} type="submit" variant="contained">
            Confirm receipt
          </Button>
        </Stack>
      </Paper>
    </Page>
  )
}

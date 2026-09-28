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
import { Page } from '../../shared/components/Page'
import { useNotification } from '../../shared/notifications/notificationContext'
import { useAdjustStock, useInventory } from './hooks'
import { batchLabel } from './types'

export function StockAdjustPage() {
  const inventory = useInventory({ page: 1, pageSize: 100 })
  const mutation = useAdjustStock()
  const navigate = useNavigate()
  const { notify } = useNotification()
  const [batchId, setBatchId] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (!batchId) {
      setError('Select a batch.')
      return
    }
    const form = new FormData(event.currentTarget)
    try {
      await mutation.mutateAsync({
        medicineBatchId: batchId,
        quantity: String(form.get('quantity') ?? '').trim(),
        reason: String(form.get('reason') ?? '').trim(),
      })
      notify('Stock adjustment recorded.', 'success')
      navigate('/pharmacy/inventory', { replace: true })
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'The stock adjustment could not be recorded.',
      )
    }
  }

  return (
    <Page
      title="Adjust stock"
      description="Appends a signed adjustment movement. A reason is required. Available stock cannot become negative."
      actions={<Button component={Link} to="/pharmacy/inventory">Cancel</Button>}
    >
      <Paper sx={{ p: 3 }}>
        <Stack component="form" spacing={2.5} onSubmit={(event) => void handleSubmit(event)}>
          {error && <Alert severity="error">{error}</Alert>}
          <FormControl fullWidth required>
            <InputLabel id="adjust-batch">Batch</InputLabel>
            <Select
              label="Batch"
              labelId="adjust-batch"
              onChange={(event) => setBatchId(event.target.value)}
              value={batchId}
            >
              {(inventory.data?.data ?? []).map((batch) => (
                <MenuItem key={batch.id} value={batch.id}>
                  {batchLabel(batch)} (available {batch.availableQuantity})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            helperText="Use a positive quantity to increase stock or a negative quantity to decrease it."
            label="Quantity"
            name="quantity"
            required
            slotProps={{ htmlInput: { 'aria-label': 'Adjustment quantity' } }}
          />
          <TextField
            label="Reason"
            name="reason"
            required
            slotProps={{ htmlInput: { maxLength: 500, 'aria-label': 'Adjustment reason' } }}
          />
          <Button disabled={mutation.isPending} type="submit" variant="contained">
            Confirm adjustment
          </Button>
        </Stack>
      </Paper>
    </Page>
  )
}

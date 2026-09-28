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
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { Page } from '../../shared/components/Page'
import { useNotification } from '../../shared/notifications/notificationContext'
import { useCreatePrescription, useMedicines } from './hooks'
import { medicineLabel } from './types'

export function PrescriptionCreatePage() {
  const { medicalRecordId = '' } = useParams()
  const medicines = useMedicines({ page: 1, pageSize: 100 })
  const mutation = useCreatePrescription()
  const navigate = useNavigate()
  const { notify } = useNotification()
  const [medicineId, setMedicineId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const selected = (medicines.data?.data ?? []).find((item) => item.id === medicineId)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (!medicineId || !selected) {
      setError('Select an active medicine.')
      return
    }
    const form = new FormData(event.currentTarget)
    try {
      const prescription = await mutation.mutateAsync({
        medicalRecordId,
        notes: String(form.get('notes') ?? '').trim() || null,
        items: [{
          medicineId,
          dosage: String(form.get('dosage') ?? '').trim(),
          route: String(form.get('route') ?? '').trim() || null,
          frequency: String(form.get('frequency') ?? '').trim(),
          duration: String(form.get('duration') ?? '').trim(),
          instructions: String(form.get('instructions') ?? '').trim() || null,
          quantityPrescribed: String(form.get('quantityPrescribed') ?? '').trim(),
          unit: selected.inventoryUnit,
        }],
      })
      notify('Prescription created.', 'success')
      navigate(`/prescriptions/${prescription.id}`, { replace: true })
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'The prescription could not be created.',
      )
    }
  }

  return (
    <Page
      title="New prescription"
      description="The prescribing doctor is taken from your linked doctor profile. Item units use the medicine inventory unit."
      actions={<Button component={Link} to={`/medical-records/${medicalRecordId}`}>Cancel</Button>}
    >
      <Paper sx={{ p: 3 }}>
        <Stack component="form" spacing={2.5} onSubmit={(event) => void handleSubmit(event)}>
          {error && <Alert severity="error">{error}</Alert>}
          <FormControl>
            <InputLabel id="medicine-select">Medicine</InputLabel>
            <Select
              label="Medicine"
              labelId="medicine-select"
              onChange={(event) => setMedicineId(event.target.value)}
              value={medicineId}
            >
              {(medicines.data?.data ?? []).map((medicine) => (
                <MenuItem key={medicine.id} value={medicine.id}>
                  {medicineLabel(medicine)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {selected && (
            <TextField disabled label="Unit" value={selected.inventoryUnit} />
          )}
          <TextField label="Dosage" name="dosage" required />
          <TextField label="Route" name="route" />
          <TextField label="Frequency" name="frequency" required />
          <TextField label="Duration" name="duration" required />
          <TextField label="Quantity prescribed" name="quantityPrescribed" required />
          <TextField label="Instructions" multiline name="instructions" />
          <TextField label="Notes" multiline name="notes" />
          <Button disabled={mutation.isPending} type="submit" variant="contained">
            {mutation.isPending ? 'Creating…' : 'Create prescription'}
          </Button>
        </Stack>
      </Paper>
    </Page>
  )
}

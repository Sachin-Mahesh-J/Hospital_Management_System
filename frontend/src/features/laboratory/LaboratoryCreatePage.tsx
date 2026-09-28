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
  Typography,
} from '@mui/material'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { Page } from '../../shared/components/Page'
import { useNotification } from '../../shared/notifications/notificationContext'
import { usePatients } from '../patients/hooks'
import { useCreateLabRequest, useLabTests } from './hooks'
import { labPatientLabel, labTestLabel } from './types'

export function LaboratoryCreatePage() {
  const patients = usePatients({ page: 1, pageSize: 100 })
  const tests = useLabTests({ page: 1, pageSize: 100 })
  const mutation = useCreateLabRequest()
  const navigate = useNavigate()
  const { notify } = useNotification()
  const [patientId, setPatientId] = useState('')
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([])
  const [pendingTestId, setPendingTestId] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleAddTest = () => {
    if (!pendingTestId) return
    setSelectedTestIds((current) => [...current, pendingTestId])
  }

  const handleRemoveTest = (index: number) => {
    setSelectedTestIds((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (!patientId) {
      setError('Select a patient.')
      return
    }
    if (selectedTestIds.length === 0) {
      setError('Add at least one laboratory test.')
      return
    }
    const form = new FormData(event.currentTarget)
    const medicalRecordId = String(form.get('medicalRecordId') ?? '').trim()
    try {
      const request = await mutation.mutateAsync({
        patientId,
        medicalRecordId: medicalRecordId || null,
        clinicalNote: String(form.get('clinicalNote') ?? '').trim() || null,
        items: selectedTestIds.map((testDefinitionId) => ({ testDefinitionId })),
      })
      notify('Laboratory request created.', 'success')
      navigate(`/laboratory/${request.id}`, { replace: true })
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'The laboratory request could not be created.',
      )
    }
  }

  return (
    <Page
      title="New laboratory request"
      description="The requesting doctor is taken from your linked doctor profile. Duplicate tests on one request are allowed. Clinical notes cannot be changed later."
      actions={<Button component={Link} to="/laboratory">Cancel</Button>}
    >
      <Paper sx={{ p: 3 }}>
        <Stack component="form" spacing={2.5} onSubmit={(event) => void handleSubmit(event)}>
          {error && <Alert severity="error">{error}</Alert>}
          <FormControl>
            <InputLabel id="lab-patient-select">Patient</InputLabel>
            <Select
              label="Patient"
              labelId="lab-patient-select"
              onChange={(event) => setPatientId(event.target.value)}
              value={patientId}
            >
              {(patients.data?.data ?? []).map((patient) => (
                <MenuItem key={patient.id} value={patient.id}>
                  {labPatientLabel(patient)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            helperText="Optional. When supplied, the medical record must belong to the selected patient."
            label="Medical record ID"
            name="medicalRecordId"
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormControl sx={{ flex: 1 }}>
              <InputLabel id="lab-test-select">Laboratory test</InputLabel>
              <Select
                label="Laboratory test"
                labelId="lab-test-select"
                onChange={(event) => setPendingTestId(event.target.value)}
                value={pendingTestId}
              >
                {(tests.data?.data ?? []).map((test) => (
                  <MenuItem key={test.id} value={test.id}>
                    {labTestLabel(test)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button onClick={handleAddTest} type="button" variant="outlined">
              Add test
            </Button>
          </Stack>
          {selectedTestIds.length === 0 ? (
            <Typography color="text.secondary">No tests added yet.</Typography>
          ) : (
            selectedTestIds.map((testId, index) => {
              const test = (tests.data?.data ?? []).find((item) => item.id === testId)
              return (
                <Stack
                  direction="row"
                  key={`${testId}-${index}`}
                  sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Typography>
                    {index + 1}. {test ? labTestLabel(test) : testId}
                  </Typography>
                  <Button onClick={() => handleRemoveTest(index)} size="small" type="button">
                    Remove
                  </Button>
                </Stack>
              )
            })
          )}
          <TextField
            helperText="Optional. Stored at creation and then immutable."
            label="Clinical note"
            multiline
            name="clinicalNote"
          />
          <Button disabled={mutation.isPending} type="submit" variant="contained">
            {mutation.isPending ? 'Creating…' : 'Create request'}
          </Button>
        </Stack>
      </Paper>
    </Page>
  )
}

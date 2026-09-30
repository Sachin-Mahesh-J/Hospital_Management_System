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
import { ApiError } from '../../api/client'
import { useAuth } from '../../auth/authContext'
import { hasPermission } from '../../auth/permission'
import { FormSection } from '../../shared/components/FormSection'
import { useDoctors } from '../doctors/hooks'
import { usePatients } from '../patients/hooks'
import type { AdmissionInput } from './types'

type AdmissionFormProps = {
  isPending: boolean
  onSubmit: (input: AdmissionInput) => Promise<void>
}

export function AdmissionForm({ isPending, onSubmit }: AdmissionFormProps) {
  const { user } = useAuth()
  const canReadPatients = hasPermission(user, 'patient.read')
  const canReadDoctors = hasPermission(user, 'doctor.read')
  const [patientId, setPatientId] = useState('')
  const [attendingDoctorId, setAttendingDoctorId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const patients = usePatients({ page: 1, pageSize: 100 })
  const doctors = useDoctors({
    page: 1,
    pageSize: 100,
    status: 'active',
    employmentStatus: 'active',
  })

  const eligiblePatients = (patients.data?.data ?? []).filter(
    (patient) => patient.status !== 'deceased',
  )
  const eligibleDoctors = (doctors.data?.data ?? []).filter(
    (doctor) =>
      doctor.status === 'active' && doctor.employee.employmentStatus === 'active',
  )

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    const form = new FormData(event.currentTarget)
    const reason = String(form.get('reason') ?? '').trim()
    if (!patientId) {
      setError('Select a patient.')
      return
    }
    if (!reason) {
      setError('Admission reason is required.')
      return
    }
    try {
      await onSubmit({
        patientId,
        ...(attendingDoctorId ? { attendingDoctorId } : {}),
        reason,
      })
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'The admission could not be saved.',
      )
    }
  }

  return (
    <Paper sx={{ p: { xs: 2, md: 3 } }}>
      <Stack component="form" spacing={2.5} onSubmit={(event) => void handleSubmit(event)}>
        {error && <Alert severity="error">{error}</Alert>}
        <FormSection title="Patient and care team">
          <Stack spacing={2}>
            {canReadPatients ? (
              <FormControl fullWidth>
                <InputLabel id="admission-patient">Patient</InputLabel>
                <Select
                  label="Patient"
                  labelId="admission-patient"
                  onChange={(event) => setPatientId(event.target.value)}
                  value={patientId}
                >
                  {eligiblePatients.map((patient) => (
                    <MenuItem key={patient.id} value={patient.id}>
                      {patient.firstName} {patient.lastName} ({patient.patientNumber})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <Alert severity="warning">Patient lookup is required to register an admission.</Alert>
            )}
            {canReadDoctors && (
              <FormControl fullWidth>
                <InputLabel id="admission-doctor">Attending doctor (optional)</InputLabel>
                <Select
                  label="Attending doctor (optional)"
                  labelId="admission-doctor"
                  onChange={(event) => setAttendingDoctorId(event.target.value)}
                  value={attendingDoctorId}
                >
                  <MenuItem value="">Not assigned</MenuItem>
                  {eligibleDoctors.map((doctor) => (
                    <MenuItem key={doctor.id} value={doctor.id}>
                      {doctor.employee.firstName} {doctor.employee.lastName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Stack>
        </FormSection>
        <FormSection title="Clinical">
          <TextField
            label="Admission reason"
            minRows={3}
            multiline
            name="reason"
          />
        </FormSection>
        <Button disabled={isPending} type="submit" variant="contained">
          {isPending ? 'Registering…' : 'Register admission'}
        </Button>
      </Stack>
    </Paper>
  )
}

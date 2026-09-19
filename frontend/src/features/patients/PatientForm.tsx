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
import {
  dobPrecisions,
  patientSexValues,
  patientStatuses,
  type DobPrecision,
  type Patient,
  type PatientInput,
  type PatientStatus,
  type PatientUpdate,
} from './types'

type PatientFormProps = {
  patient?: Patient
  isPending: boolean
  onSubmit: (input: PatientInput | PatientUpdate) => Promise<void>
  submitLabel: string
  allowStatus?: boolean
}

function inputDob(patient?: Patient): string {
  if (!patient?.dateOfBirth) return ''
  if (patient.dateOfBirthPrecision === 'year') {
    return patient.dateOfBirth.slice(0, 4)
  }
  if (patient.dateOfBirthPrecision === 'month') {
    return patient.dateOfBirth.slice(0, 7)
  }
  return patient.dateOfBirth
}

function normalizedDob(value: string, precision: DobPrecision): string | null {
  if (precision === 'unknown') return null
  if (precision === 'year') return `${value}-01-01`
  if (precision === 'month') return `${value}-01`
  return value
}

function optional(form: FormData, name: string): string | null {
  const value = String(form.get(name) ?? '').trim()
  return value || null
}

export function PatientForm({
  patient,
  isPending,
  onSubmit,
  submitLabel,
  allowStatus = false,
}: PatientFormProps) {
  const [precision, setPrecision] = useState<DobPrecision>(
    patient?.dateOfBirthPrecision ?? 'exact',
  )
  const [dateValue, setDateValue] = useState(inputDob(patient))
  const [status, setStatus] = useState<PatientStatus>(
    patient?.status ?? 'active',
  )
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    const form = new FormData(event.currentTarget)
    const dateOfBirth = normalizedDob(dateValue, precision)
    if (
      dateOfBirth &&
      new Date(`${dateOfBirth}T00:00:00.000Z`) > new Date()
    ) {
      setError('Date of birth cannot be in the future.')
      return
    }
    const input: PatientInput | PatientUpdate = {
      firstName: String(form.get('firstName') ?? '').trim(),
      lastName: String(form.get('lastName') ?? '').trim(),
      dateOfBirth,
      dateOfBirthPrecision: precision,
      sexAtRegistration:
        (optional(form, 'sexAtRegistration') as PatientInput['sexAtRegistration']),
      phone: optional(form, 'phone'),
      email: optional(form, 'email'),
      addressText: optional(form, 'addressText'),
      emergencyContactName: optional(form, 'emergencyContactName'),
      emergencyContactPhone: optional(form, 'emergencyContactPhone'),
      ...(allowStatus ? { status } : {}),
    }
    try {
      await onSubmit(input)
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'The patient could not be saved.',
      )
    }
  }

  const dateType =
    precision === 'year' ? 'number' : precision === 'month' ? 'month' : 'date'
  const today = new Date().toISOString().slice(0, 10)

  return (
    <Paper sx={{ p: { xs: 2, md: 3 } }}>
      <Stack component="form" spacing={2.5} onSubmit={(event) => void handleSubmit(event)}>
        {error && <Alert severity="error">{error}</Alert>}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            defaultValue={patient?.firstName ?? ''}
            fullWidth
            slotProps={{ htmlInput: { maxLength: 100 } }}
            label="First name"
            name="firstName"
            required
          />
          <TextField
            defaultValue={patient?.lastName ?? ''}
            fullWidth
            slotProps={{ htmlInput: { maxLength: 100 } }}
            label="Last name"
            name="lastName"
            required
          />
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <FormControl fullWidth>
            <InputLabel id="dob-precision-label">Date precision</InputLabel>
            <Select
              label="Date precision"
              labelId="dob-precision-label"
              onChange={(event) => {
                const next = event.target.value as DobPrecision
                setPrecision(next)
                setDateValue('')
              }}
              value={precision}
            >
              {dobPrecisions.map((value) => (
                <MenuItem key={value} value={value}>
                  {value.replace('_', ' ')}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {precision !== 'unknown' && (
            <TextField
              fullWidth
              slotProps={{
                htmlInput: {
                  ...(dateType === 'date' ? { max: today } : {}),
                  ...(dateType === 'month' ? { max: today.slice(0, 7) } : {}),
                  ...(dateType === 'number'
                    ? { min: 1800, max: Number(today.slice(0, 4)) }
                    : {}),
                },
              }}
              label={
                precision === 'year'
                  ? 'Birth year'
                  : precision === 'month'
                    ? 'Birth month'
                    : 'Date of birth'
              }
              onChange={(event) => setDateValue(event.target.value)}
              required
              type={dateType}
              value={dateValue}
            />
          )}
          <FormControl fullWidth>
            <InputLabel id="sex-label">Sex at registration</InputLabel>
            <Select
              defaultValue={patient?.sexAtRegistration ?? ''}
              label="Sex at registration"
              labelId="sex-label"
              name="sexAtRegistration"
            >
              <MenuItem value="">Not recorded</MenuItem>
              {patientSexValues.map((value) => (
                <MenuItem key={value} value={value}>
                  {value.replace('_', ' ')}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField defaultValue={patient?.phone ?? ''} fullWidth slotProps={{ htmlInput: { maxLength: 30 } }} label="Phone" name="phone" />
          <TextField defaultValue={patient?.email ?? ''} fullWidth slotProps={{ htmlInput: { maxLength: 254 } }} label="Email" name="email" type="email" />
        </Stack>
        <TextField defaultValue={patient?.addressText ?? ''} slotProps={{ htmlInput: { maxLength: 2000 } }} label="Address" multiline name="addressText" rows={3} />
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField defaultValue={patient?.emergencyContactName ?? ''} fullWidth slotProps={{ htmlInput: { maxLength: 200 } }} label="Emergency contact name" name="emergencyContactName" />
          <TextField defaultValue={patient?.emergencyContactPhone ?? ''} fullWidth slotProps={{ htmlInput: { maxLength: 30 } }} label="Emergency contact phone" name="emergencyContactPhone" />
        </Stack>
        {allowStatus && (
          <FormControl sx={{ maxWidth: 320 }}>
            <InputLabel id="status-label">Patient status</InputLabel>
            <Select
              label="Patient status"
              labelId="status-label"
              onChange={(event) => setStatus(event.target.value as PatientStatus)}
              value={status}
            >
              {patientStatuses.map((value) => (
                <MenuItem key={value} value={value}>{value}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        <Button disabled={isPending} type="submit" variant="contained">
          {isPending ? 'Saving…' : submitLabel}
        </Button>
      </Stack>
    </Paper>
  )
}

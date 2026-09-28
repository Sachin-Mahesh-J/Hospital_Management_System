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
import { useEmployees } from '../employees/hooks'
import {
  doctorStatuses,
  type Doctor,
  type DoctorInput,
  type DoctorStatus,
  type DoctorUpdate,
} from './types'

type DoctorFormProps = {
  doctor?: Doctor
  isPending: boolean
  onSubmit: (input: DoctorInput | DoctorUpdate) => Promise<void>
  submitLabel: string
  allowStatus?: boolean
}

function optional(form: FormData, name: string): string | null {
  const value = String(form.get(name) ?? '').trim()
  return value || null
}

export function DoctorForm({
  doctor,
  isPending,
  onSubmit,
  submitLabel,
  allowStatus = false,
}: DoctorFormProps) {
  const employees = useEmployees({
    page: 1,
    pageSize: 100,
    hasDoctorProfile: doctor ? undefined : 'false',
  })
  const [employeeId, setEmployeeId] = useState(doctor?.employeeId ?? '')
  const [status, setStatus] = useState<DoctorStatus>(doctor?.status ?? 'active')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (!doctor && !employeeId) {
      setError('Select an existing employee for this doctor profile.')
      return
    }
    const form = new FormData(event.currentTarget)
    const input: DoctorInput | DoctorUpdate = {
      ...(doctor ? {} : { employeeId }),
      licenseNumber: String(form.get('licenseNumber') ?? '').trim(),
      specialization: String(form.get('specialization') ?? '').trim(),
      professionalSummary: optional(form, 'professionalSummary'),
      contactExtension: optional(form, 'contactExtension'),
      ...(allowStatus ? { status } : {}),
    }
    try {
      await onSubmit(input)
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'The doctor profile could not be saved.',
      )
    }
  }

  return (
    <Paper sx={{ p: { xs: 2, md: 3 } }}>
      <Stack component="form" spacing={2.5} onSubmit={(event) => void handleSubmit(event)}>
        {error && <Alert severity="error">{error}</Alert>}
        {!doctor && employees.isError && (
          <Alert severity="error">Eligible employees could not be loaded.</Alert>
        )}
        {doctor ? (
          <TextField
            disabled
            label="Employee"
            value={`${doctor.employee.employeeNumber} — ${doctor.employee.firstName} ${doctor.employee.lastName}`}
          />
        ) : (
          <FormControl fullWidth required>
            <InputLabel id="doctor-employee-label">Employee</InputLabel>
            <Select
              label="Employee"
              labelId="doctor-employee-label"
              onChange={(event) => setEmployeeId(event.target.value)}
              value={employeeId}
            >
              {(employees.data?.data ?? []).map((employee) => (
                <MenuItem key={employee.id} value={employee.id}>
                  {employee.firstName} {employee.lastName} ({employee.employeeNumber})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            defaultValue={doctor?.licenseNumber ?? ''}
            fullWidth
            slotProps={{ htmlInput: { maxLength: 100 } }}
            label="License number"
            name="licenseNumber"
            required
          />
          <TextField
            defaultValue={doctor?.specialization ?? ''}
            fullWidth
            slotProps={{ htmlInput: { maxLength: 150 } }}
            label="Specialization"
            name="specialization"
            required
          />
        </Stack>
        <TextField
          defaultValue={doctor?.contactExtension ?? ''}
          label="Contact extension"
          name="contactExtension"
          slotProps={{ htmlInput: { maxLength: 20 } }}
        />
        <TextField
          defaultValue={doctor?.professionalSummary ?? ''}
          label="Professional summary"
          multiline
          name="professionalSummary"
          rows={3}
          slotProps={{ htmlInput: { maxLength: 5000 } }}
        />
        {allowStatus && (
          <FormControl sx={{ maxWidth: 320 }}>
            <InputLabel id="doctor-status-label">Doctor status</InputLabel>
            <Select
              label="Doctor status"
              labelId="doctor-status-label"
              onChange={(event) => setStatus(event.target.value as DoctorStatus)}
              value={status}
            >
              {doctorStatuses.map((value) => (
                <MenuItem key={value} value={value}>{value}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        <Button disabled={isPending || (!doctor && employees.isLoading)} type="submit" variant="contained">
          {isPending ? 'Saving…' : submitLabel}
        </Button>
      </Stack>
    </Paper>
  )
}

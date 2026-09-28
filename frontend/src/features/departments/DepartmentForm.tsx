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
  departmentStatuses,
  type Department,
  type DepartmentInput,
  type DepartmentStatus,
  type DepartmentUpdate,
} from './types'

type DepartmentFormProps = {
  department?: Department
  isPending: boolean
  onSubmit: (input: DepartmentInput | DepartmentUpdate) => Promise<void>
  submitLabel: string
  allowStatus?: boolean
}

function optional(form: FormData, name: string): string | null {
  const value = String(form.get(name) ?? '').trim()
  return value || null
}

export function DepartmentForm({
  department,
  isPending,
  onSubmit,
  submitLabel,
  allowStatus = false,
}: DepartmentFormProps) {
  const [status, setStatus] = useState<DepartmentStatus>(
    department?.status ?? 'active',
  )
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    const form = new FormData(event.currentTarget)
    const input: DepartmentInput | DepartmentUpdate = {
      code: String(form.get('code') ?? '').trim(),
      name: String(form.get('name') ?? '').trim(),
      description: optional(form, 'description'),
      ...(allowStatus ? { status } : {}),
    }
    try {
      await onSubmit(input)
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'The department could not be saved.',
      )
    }
  }

  return (
    <Paper sx={{ p: { xs: 2, md: 3 } }}>
      <Stack component="form" spacing={2.5} onSubmit={(event) => void handleSubmit(event)}>
        {error && <Alert severity="error">{error}</Alert>}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            defaultValue={department?.code ?? ''}
            fullWidth
            slotProps={{ htmlInput: { maxLength: 30 } }}
            label="Code"
            name="code"
            required
          />
          <TextField
            defaultValue={department?.name ?? ''}
            fullWidth
            slotProps={{ htmlInput: { maxLength: 150 } }}
            label="Name"
            name="name"
            required
          />
        </Stack>
        <TextField
          defaultValue={department?.description ?? ''}
          label="Description"
          multiline
          name="description"
          rows={3}
          slotProps={{ htmlInput: { maxLength: 2000 } }}
        />
        {allowStatus && (
          <FormControl sx={{ maxWidth: 320 }}>
            <InputLabel id="department-status-label">Status</InputLabel>
            <Select
              label="Status"
              labelId="department-status-label"
              onChange={(event) => setStatus(event.target.value as DepartmentStatus)}
              value={status}
            >
              {departmentStatuses.map((value) => (
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

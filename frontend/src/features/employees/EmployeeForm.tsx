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
import { useDepartments } from '../departments/hooks'
import {
  employmentStatuses,
  type Employee,
  type EmployeeInput,
  type EmployeeUpdate,
  type EmploymentStatus,
} from './types'

type EmployeeFormProps = {
  employee?: Employee
  isPending: boolean
  onSubmit: (input: EmployeeInput | EmployeeUpdate) => Promise<void>
  submitLabel: string
  allowStatus?: boolean
}

function optional(form: FormData, name: string): string | null {
  const value = String(form.get(name) ?? '').trim()
  return value || null
}

export function EmployeeForm({
  employee,
  isPending,
  onSubmit,
  submitLabel,
  allowStatus = false,
}: EmployeeFormProps) {
  const departments = useDepartments({ page: 1, pageSize: 100, status: 'active' })
  const [employmentStatus, setEmploymentStatus] = useState<EmploymentStatus>(
    employee?.employmentStatus ?? 'active',
  )
  const [departmentId, setDepartmentId] = useState(
    employee?.departmentId ?? '',
  )
  const [error, setError] = useState<string | null>(null)

  const departmentOptions = departments.data?.data ?? []
  const selectedStillListed = departmentOptions.some((item) => item.id === departmentId)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (!departmentId) {
      setError('A department is required.')
      return
    }
    const form = new FormData(event.currentTarget)
    const endDate = optional(form, 'endDate')
    const hireDate = String(form.get('hireDate') ?? '').trim()
    if (endDate && hireDate && endDate < hireDate) {
      setError('End date cannot be earlier than hire date.')
      return
    }
    const userId = optional(form, 'userId')
    const input: EmployeeInput | EmployeeUpdate = {
      firstName: String(form.get('firstName') ?? '').trim(),
      lastName: String(form.get('lastName') ?? '').trim(),
      jobTitle: String(form.get('jobTitle') ?? '').trim(),
      departmentId,
      phone: optional(form, 'phone'),
      email: optional(form, 'email'),
      hireDate,
      endDate,
      userId,
      ...(allowStatus ? { employmentStatus } : {}),
    }
    try {
      await onSubmit(input)
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'The employee could not be saved.',
      )
    }
  }

  return (
    <Paper sx={{ p: { xs: 2, md: 3 } }}>
      <Stack component="form" spacing={2.5} onSubmit={(event) => void handleSubmit(event)}>
        {error && <Alert severity="error">{error}</Alert>}
        {departments.isError && (
          <Alert severity="error">Active departments could not be loaded.</Alert>
        )}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            defaultValue={employee?.firstName ?? ''}
            fullWidth
            slotProps={{ htmlInput: { maxLength: 100 } }}
            label="First name"
            name="firstName"
            required
          />
          <TextField
            defaultValue={employee?.lastName ?? ''}
            fullWidth
            slotProps={{ htmlInput: { maxLength: 100 } }}
            label="Last name"
            name="lastName"
            required
          />
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            defaultValue={employee?.jobTitle ?? ''}
            fullWidth
            slotProps={{ htmlInput: { maxLength: 100 } }}
            label="Job title"
            name="jobTitle"
            required
          />
          <FormControl fullWidth required>
            <InputLabel id="employee-department-label">Department</InputLabel>
            <Select
              label="Department"
              labelId="employee-department-label"
              onChange={(event) => setDepartmentId(event.target.value)}
              value={departmentId}
            >
              {!selectedStillListed && employee && (
                <MenuItem value={employee.departmentId}>
                  {employee.department.name} ({employee.department.status})
                </MenuItem>
              )}
              {departmentOptions.map((department) => (
                <MenuItem key={department.id} value={department.id}>
                  {department.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField defaultValue={employee?.phone ?? ''} fullWidth slotProps={{ htmlInput: { maxLength: 30 } }} label="Phone" name="phone" />
          <TextField defaultValue={employee?.email ?? ''} fullWidth slotProps={{ htmlInput: { maxLength: 254 } }} label="Email" name="email" type="email" />
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            defaultValue={employee?.hireDate ?? ''}
            fullWidth
            label="Hire date"
            name="hireDate"
            required
            type="date"
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            defaultValue={employee?.endDate ?? ''}
            fullWidth
            label="End date"
            name="endDate"
            type="date"
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Stack>
        <TextField
          defaultValue={employee?.userId ?? ''}
          helperText="Optional existing HMS user ID. Accounts are not created automatically."
          label="Linked user ID"
          name="userId"
          slotProps={{ htmlInput: { maxLength: 36 } }}
        />
        {allowStatus && (
          <FormControl sx={{ maxWidth: 320 }}>
            <InputLabel id="employment-status-label">Employment status</InputLabel>
            <Select
              label="Employment status"
              labelId="employment-status-label"
              onChange={(event) => setEmploymentStatus(event.target.value as EmploymentStatus)}
              value={employmentStatus}
            >
              {employmentStatuses.map((value) => (
                <MenuItem key={value} value={value}>{value}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        <Button disabled={isPending || departments.isLoading} type="submit" variant="contained">
          {isPending ? 'Saving…' : submitLabel}
        </Button>
      </Stack>
    </Paper>
  )
}

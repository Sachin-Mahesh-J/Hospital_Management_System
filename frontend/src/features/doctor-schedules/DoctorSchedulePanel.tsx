import {
  Alert,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { useState, type FormEvent } from 'react'
import { ApiError } from '../../api/client'
import { Can } from '../../auth/Can'
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../shared/components/StateViews'
import { useNotification } from '../../shared/notifications/notificationContext'
import {
  useCreateDoctorSchedule,
  useDoctorSchedules,
  useUpdateDoctorSchedule,
} from './hooks'
import {
  instantToLocalInput,
  localDateTimeToOffsetIso,
  scheduleStatuses,
  type ScheduleStatus,
} from './types'

export function DoctorSchedulePanel({ doctorId }: { doctorId: string }) {
  const [statusFilter, setStatusFilter] = useState<ScheduleStatus | ''>('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const query = useDoctorSchedules(doctorId, {
    page: 1,
    pageSize: 50,
    ...(statusFilter ? { status: statusFilter } : {}),
  })
  const createMutation = useCreateDoctorSchedule(doctorId)
  const updateMutation = useUpdateDoctorSchedule(doctorId)
  const { notify } = useNotification()

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const startsLocal = String(form.get('startsAt') ?? '')
    const endsLocal = String(form.get('endsAt') ?? '')
    if (!startsLocal || !endsLocal) {
      setFormError('Start and end date/time are required.')
      return
    }
    const startsAt = localDateTimeToOffsetIso(startsLocal)
    const endsAt = localDateTimeToOffsetIso(endsLocal)
    if (Date.parse(endsAt) <= Date.parse(startsAt)) {
      setFormError('Schedule end must be after schedule start.')
      return
    }
    const note = String(form.get('note') ?? '').trim() || null
    const status = String(form.get('status') ?? 'available') as ScheduleStatus
    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          scheduleId: editingId,
          input: { startsAt, endsAt, status, note },
        })
        notify('Schedule updated successfully.', 'success')
        setEditingId(null)
      } else {
        await createMutation.mutateAsync({ startsAt, endsAt, status, note })
        notify('Schedule created successfully.', 'success')
      }
      formElement.reset()
    } catch (caught) {
      setFormError(
        caught instanceof ApiError
          ? caught.message
          : 'The schedule could not be saved.',
      )
    }
  }

  const editing = query.data?.data.find((item) => item.id === editingId)
  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Stack spacing={2}>
      <Typography component="h2" variant="h6">Schedules</Typography>
      <Typography color="text.secondary" variant="body2">
        Each row is an explicit start/end interval. Recurrence, breaks, holidays, and
        overlap policy are not implemented in this milestone.
      </Typography>

      <Paper sx={{ p: 2 }}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="schedule-status-filter">Status filter</InputLabel>
          <Select
            label="Status filter"
            labelId="schedule-status-filter"
            onChange={(event) => setStatusFilter(event.target.value as ScheduleStatus | '')}
            value={statusFilter}
          >
            <MenuItem value="">All statuses</MenuItem>
            {scheduleStatuses.map((value) => (
              <MenuItem key={value} value={value}>{value}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>

      {query.isLoading && <LoadingState label="Loading schedules" />}
      {query.isError && (
        <ErrorState
          message={query.error instanceof ApiError ? query.error.message : 'Schedules could not be loaded.'}
          onRetry={() => void query.refetch()}
        />
      )}
      {query.data && query.data.data.length === 0 && (
        <EmptyState
          title="No schedules found"
          description="Create an explicit interval if you have schedule write access."
        />
      )}
      {query.data && query.data.data.length > 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Start</TableCell>
                <TableCell>End</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Note</TableCell>
                <Can permission="doctor_schedule.update">
                  <TableCell align="right">Actions</TableCell>
                </Can>
              </TableRow>
            </TableHead>
            <TableBody>
              {query.data.data.map((schedule) => (
                <TableRow hover key={schedule.id}>
                  <TableCell>{new Date(schedule.startsAt).toLocaleString()}</TableCell>
                  <TableCell>{new Date(schedule.endsAt).toLocaleString()}</TableCell>
                  <TableCell>{schedule.status}</TableCell>
                  <TableCell>{schedule.note ?? '—'}</TableCell>
                  <Can permission="doctor_schedule.update">
                    <TableCell align="right">
                      <Button
                        onClick={() => {
                          setEditingId(schedule.id)
                          setFormError(null)
                        }}
                        size="small"
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </Can>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Can permission={editingId ? 'doctor_schedule.update' : 'doctor_schedule.create'}>
        <Paper sx={{ p: 3 }}>
          <Stack component="form" spacing={2} onSubmit={(event) => void handleSubmit(event)}>
            <Typography variant="subtitle1">
              {editingId ? 'Edit schedule' : 'Create schedule'}
            </Typography>
            {formError && <Alert severity="error">{formError}</Alert>}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                defaultValue={editing ? instantToLocalInput(editing.startsAt) : ''}
                fullWidth
                key={`start-${editingId ?? 'new'}`}
                label="Start"
                name="startsAt"
                required
                slotProps={{
                  htmlInput: { 'aria-label': 'Start' },
                  inputLabel: { shrink: true },
                }}
                type="datetime-local"
              />
              <TextField
                defaultValue={editing ? instantToLocalInput(editing.endsAt) : ''}
                fullWidth
                key={`end-${editingId ?? 'new'}`}
                label="End"
                name="endsAt"
                required
                slotProps={{
                  htmlInput: { 'aria-label': 'End' },
                  inputLabel: { shrink: true },
                }}
                type="datetime-local"
              />
            </Stack>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel id="schedule-status-label">Status</InputLabel>
                <Select
                  defaultValue={editing?.status ?? 'available'}
                  key={`status-${editingId ?? 'new'}`}
                  label="Status"
                  labelId="schedule-status-label"
                  name="status"
                >
                  {scheduleStatuses.map((value) => (
                    <MenuItem key={value} value={value}>{value}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                defaultValue={editing?.note ?? ''}
                fullWidth
                key={`note-${editingId ?? 'new'}`}
                label="Note"
                name="note"
                slotProps={{ htmlInput: { maxLength: 500 } }}
              />
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button disabled={isPending} type="submit" variant="contained">
                {isPending ? 'Saving…' : editingId ? 'Save schedule' : 'Create schedule'}
              </Button>
              {editingId && (
                <Button
                  onClick={() => {
                    setEditingId(null)
                    setFormError(null)
                  }}
                >
                  Cancel edit
                </Button>
              )}
            </Stack>
          </Stack>
        </Paper>
      </Can>
    </Stack>
  )
}

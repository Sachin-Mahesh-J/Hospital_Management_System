import { formatCalendarDate, formatHospitalDateTime } from '../../shared/datetime/hospitalTime'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Pagination,
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
} from '@mui/material'
import { useState, type FormEvent } from 'react'
import { ApiError } from '../../api/client'
import { Can } from '../../auth/Can'
import { useAuth } from '../../auth/authContext'
import { hasPermission } from '../../auth/permission'
import { FilterBar } from '../../shared/components/FilterBar'
import { FormSection } from '../../shared/components/FormSection'
import { filterControlSx } from '../../shared/components/layoutSx'
import { Page } from '../../shared/components/Page'
import { StatusChip } from '../../shared/components/StatusChip'
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../shared/components/StateViews'
import { useNotification } from '../../shared/notifications/notificationContext'
import { instantToLocalInput, localDateTimeToOffsetIso } from '../doctor-schedules/types'
import { useEmployees } from '../employees/hooks'
import { useAttendance, useCreateAttendance, useUpdateAttendance } from './hooks'
import {
  attendanceStatuses,
  type Attendance,
  type AttendanceStatus,
} from './types'

export function AttendanceListPage() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<AttendanceStatus | ''>('')
  const [employeeId, setEmployeeId] = useState('')
  const [editor, setEditor] = useState<Attendance | 'new' | null>(null)
  const employees = useEmployees({ page: 1, pageSize: 100 })
  const query = useAttendance({
    page,
    pageSize: 20,
    ...(status ? { status } : {}),
    ...(employeeId ? { employeeId } : {}),
  })
  const create = useCreateAttendance()
  const update = useUpdateAttendance()
  const { notify } = useNotification()
  const { user } = useAuth()
  const canRecordAttendance = hasPermission(user, 'attendance.create')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const checkInLocal = String(form.get('checkInAt') || '')
    const checkOutLocal = String(form.get('checkOutAt') || '')
    const payload = {
      status: String(form.get('status')) as AttendanceStatus,
      checkInAt: checkInLocal ? localDateTimeToOffsetIso(checkInLocal) : null,
      checkOutAt: checkOutLocal ? localDateTimeToOffsetIso(checkOutLocal) : null,
      note: String(form.get('note') || '').trim() || null,
    }
    try {
      if (editor === 'new') {
        await create.mutateAsync({
          employeeId: String(form.get('employeeId')),
          workDate: String(form.get('workDate')),
          ...payload,
        })
        notify('Attendance recorded.', 'success')
      } else if (editor) {
        await update.mutateAsync({ id: editor.id, input: payload })
        notify('Attendance updated.', 'success')
      }
      setEditor(null)
    } catch (error) {
      notify(
        error instanceof ApiError ? error.message : 'Attendance could not be saved.',
        'error',
      )
    }
  }

  return (
    <Page
      title="Attendance"
      description="One record per employee per work date. Historical rows remain available for inactive or terminated employees."
      actions={
        <Can permission="attendance.create">
          <Button onClick={() => setEditor('new')} variant="contained">
            Record attendance
          </Button>
        </Can>
      }
    >
      <FilterBar>
          <FormControl size="small" sx={filterControlSx}>
            <InputLabel id="attendance-employee">Employee</InputLabel>
            <Select
              label="Employee"
              labelId="attendance-employee"
              onChange={(event) => {
                setEmployeeId(event.target.value)
                setPage(1)
              }}
              value={employeeId}
            >
              <MenuItem value="">All employees</MenuItem>
              {(employees.data?.data ?? []).map((employee) => (
                <MenuItem key={employee.id} value={employee.id}>
                  {employee.firstName} {employee.lastName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={filterControlSx}>
            <InputLabel id="attendance-status">Status</InputLabel>
            <Select
              label="Status"
              labelId="attendance-status"
              onChange={(event) => {
                setStatus(event.target.value as AttendanceStatus | '')
                setPage(1)
              }}
              value={status}
            >
              <MenuItem value="">All statuses</MenuItem>
              {attendanceStatuses.map((value) => (
                <MenuItem key={value} value={value}>{value}</MenuItem>
              ))}
            </Select>
          </FormControl>
      </FilterBar>
      {query.isLoading && <LoadingState label="Loading attendance" />}
      {query.isError && (
        <ErrorState
          message={query.error instanceof ApiError ? query.error.message : 'Attendance could not be loaded.'}
          onRetry={() => void query.refetch()}
        />
      )}
      {query.data && query.data.data.length === 0 && (
        <EmptyState
          action={
            canRecordAttendance ? (
              <Button onClick={() => setEditor('new')} variant="contained">
                Record attendance
              </Button>
            ) : undefined
          }
          description={
            canRecordAttendance
              ? 'Record attendance for a work date or adjust the employee and status filters.'
              : 'No attendance matches the current filters.'
          }
          title="No attendance records"
        />
      )}
      {query.data && query.data.data.length > 0 && (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Employee</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Check-in</TableCell>
                  <TableCell>Check-out</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {query.data.data.map((row) => (
                  <TableRow hover key={row.id}>
                    <TableCell>{formatCalendarDate(row.workDate)}</TableCell>
                    <TableCell>
                      {row.employee.firstName} {row.employee.lastName}
                    </TableCell>
                    <TableCell><StatusChip value={row.status} /></TableCell>
                    <TableCell>{row.checkInAt ? formatHospitalDateTime(row.checkInAt) : '—'}</TableCell>
                    <TableCell>{row.checkOutAt ? formatHospitalDateTime(row.checkOutAt) : '—'}</TableCell>
                    <TableCell align="right">
                      <Can permission="attendance.update">
                        <Button onClick={() => setEditor(row)} size="small">Edit</Button>
                      </Can>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Pagination
            count={Math.max(query.data.pagination.totalPages, 1)}
            onChange={(_event, value) => setPage(value)}
            page={page}
            sx={{ alignSelf: 'center' }}
          />
        </>
      )}
      <Dialog fullWidth maxWidth="sm" onClose={() => setEditor(null)} open={editor !== null}>
        <DialogTitle>{editor === 'new' ? 'Record attendance' : 'Edit attendance'}</DialogTitle>
        <Stack component="form" onSubmit={(event) => void submit(event)}>
          <DialogContent>
            <Stack spacing={3}>
              {editor === 'new' && (
                <FormSection title="Assignment">
                  <Stack spacing={2}>
                    <FormControl fullWidth required>
                      <InputLabel id="attendance-form-employee">Employee</InputLabel>
                      <Select defaultValue="" label="Employee" labelId="attendance-form-employee" name="employeeId">
                        {(employees.data?.data ?? []).map((employee) => (
                          <MenuItem key={employee.id} value={employee.id}>
                            {employee.firstName} {employee.lastName} ({employee.employmentStatus})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField label="Work date" name="workDate" required type="date" slotProps={{ inputLabel: { shrink: true } }} />
                  </Stack>
                </FormSection>
              )}
              <FormSection title="Attendance">
                <Stack spacing={2}>
                  <FormControl fullWidth required>
                    <InputLabel id="attendance-form-status">Status</InputLabel>
                    <Select
                      defaultValue={editor && editor !== 'new' ? editor.status : 'present'}
                      label="Status"
                      labelId="attendance-form-status"
                      name="status"
                    >
                      {attendanceStatuses.map((value) => (
                        <MenuItem key={value} value={value}>{value}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      defaultValue={
                        editor && editor !== 'new' && editor.checkInAt
                          ? instantToLocalInput(editor.checkInAt)
                          : ''
                      }
                      fullWidth
                      label="Check-in"
                      name="checkInAt"
                      slotProps={{ inputLabel: { shrink: true } }}
                      type="datetime-local"
                    />
                    <TextField
                      defaultValue={
                        editor && editor !== 'new' && editor.checkOutAt
                          ? instantToLocalInput(editor.checkOutAt)
                          : ''
                      }
                      fullWidth
                      label="Check-out"
                      name="checkOutAt"
                      slotProps={{ inputLabel: { shrink: true } }}
                      type="datetime-local"
                    />
                  </Stack>
                  <TextField
                    defaultValue={editor && editor !== 'new' ? editor.note ?? '' : ''}
                    label="Note"
                    name="note"
                    slotProps={{ htmlInput: { maxLength: 500 } }}
                  />
                </Stack>
              </FormSection>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditor(null)}>Cancel</Button>
            <Button type="submit" variant="contained">Save</Button>
          </DialogActions>
        </Stack>
      </Dialog>
    </Page>
  )
}

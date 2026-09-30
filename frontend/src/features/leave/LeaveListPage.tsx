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
import { Page } from '../../shared/components/Page'
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../shared/components/StateViews'
import { useNotification } from '../../shared/notifications/notificationContext'
import {
  useApproveLeave,
  useCancelLeave,
  useCreateLeave,
  useLeave,
  useRejectLeave,
  useUpdateLeave,
} from './hooks'
import { leaveStatuses, type LeaveRecord, type LeaveStatus } from './types'

export function LeaveListPage() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<LeaveStatus | ''>('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<LeaveRecord | null>(null)
  const query = useLeave({
    page,
    pageSize: 20,
    ...(status ? { status } : {}),
  })
  const create = useCreateLeave()
  const update = useUpdateLeave()
  const approve = useApproveLeave()
  const reject = useRejectLeave()
  const cancel = useCancelLeave()
  const { notify } = useNotification()

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    try {
      await create.mutateAsync({
        leaveType: String(form.get('leaveType') ?? '').trim(),
        startsOn: String(form.get('startsOn')),
        endsOn: String(form.get('endsOn')),
        reason: String(form.get('reason') || '').trim() || null,
      })
      notify('Leave request submitted.', 'success')
      setOpen(false)
    } catch (error) {
      notify(
        error instanceof ApiError ? error.message : 'Leave could not be submitted.',
        'error',
      )
    }
  }

  return (
    <Page
      title="Leave"
      description="Employees request their own leave. Administrators approve or reject pending requests. Overlapping pending or approved leave is rejected."
      actions={
        <Can permission="leave.create">
          <Button onClick={() => setOpen(true)} variant="contained">
            Request leave
          </Button>
        </Can>
      }
    >
      <Paper sx={{ p: 2 }}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="leave-status">Status</InputLabel>
          <Select
            label="Status"
            labelId="leave-status"
            onChange={(event) => {
              setStatus(event.target.value as LeaveStatus | '')
              setPage(1)
            }}
            value={status}
          >
            <MenuItem value="">All statuses</MenuItem>
            {leaveStatuses.map((value) => (
              <MenuItem key={value} value={value}>{value}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>
      {query.isLoading && <LoadingState label="Loading leave" />}
      {query.isError && (
        <ErrorState
          message={query.error instanceof ApiError ? query.error.message : 'Leave could not be loaded.'}
          onRetry={() => void query.refetch()}
        />
      )}
      {query.data && query.data.data.length === 0 && (
        <EmptyState title="No leave records" description="Submit a request or change the status filter." />
      )}
      {query.data && query.data.data.length > 0 && (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Dates</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {query.data.data.map((row) => (
                  <TableRow hover key={row.id}>
                    <TableCell>{row.employee.firstName} {row.employee.lastName}</TableCell>
                    <TableCell>{row.leaveType}</TableCell>
                    <TableCell>{row.startsOn} – {row.endsOn}</TableCell>
                    <TableCell>{row.status}</TableCell>
                    <TableCell align="right">
                      {row.status === 'pending' && (
                        <>
                          <Can permission="leave.update">
                            <Button onClick={() => setEditing(row)} size="small">Edit</Button>
                          </Can>
                          <Can permission="leave.approve">
                            <Button
                              onClick={() => void approve.mutateAsync(row.id).then(
                                () => notify('Leave approved.', 'success'),
                                (error: unknown) => notify(error instanceof ApiError ? error.message : 'Approval failed.', 'error'),
                              )}
                              size="small"
                            >
                              Approve
                            </Button>
                            <Button
                              onClick={() => void reject.mutateAsync(row.id).then(
                                () => notify('Leave rejected.', 'success'),
                                (error: unknown) => notify(error instanceof ApiError ? error.message : 'Rejection failed.', 'error'),
                              )}
                              size="small"
                            >
                              Reject
                            </Button>
                          </Can>
                          <Can permission="leave.cancel">
                            <Button
                              onClick={() => void cancel.mutateAsync(row.id).then(
                                () => notify('Leave cancelled.', 'success'),
                                (error: unknown) => notify(error instanceof ApiError ? error.message : 'Cancellation failed.', 'error'),
                              )}
                              size="small"
                            >
                              Cancel
                            </Button>
                          </Can>
                        </>
                      )}
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
      <Dialog fullWidth maxWidth="sm" onClose={() => setEditing(null)} open={editing !== null}>
        <DialogTitle>Edit pending leave</DialogTitle>
        <Stack
          component="form"
          onSubmit={(event) => {
            event.preventDefault()
            if (!editing) return
            const form = new FormData(event.currentTarget)
            void update.mutateAsync({
              id: editing.id,
              input: {
                leaveType: String(form.get('leaveType') ?? '').trim(),
                startsOn: String(form.get('startsOn')),
                endsOn: String(form.get('endsOn')),
                reason: String(form.get('reason') || '').trim() || null,
              },
            }).then(
              () => {
                notify('Leave updated.', 'success')
                setEditing(null)
              },
              (error: unknown) => notify(
                error instanceof ApiError ? error.message : 'Leave could not be updated.',
                'error',
              ),
            )
          }}
        >
          <DialogContent>
            <Stack spacing={2}>
              <TextField
                defaultValue={editing?.leaveType ?? ''}
                label="Leave type"
                name="leaveType"
                required
                slotProps={{ htmlInput: { maxLength: 50 } }}
              />
              <TextField
                defaultValue={editing?.startsOn ?? ''}
                label="Start date"
                name="startsOn"
                required
                type="date"
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                defaultValue={editing?.endsOn ?? ''}
                label="End date"
                name="endsOn"
                required
                type="date"
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField defaultValue={editing?.reason ?? ''} label="Reason" multiline name="reason" />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit" variant="contained">Save</Button>
          </DialogActions>
        </Stack>
      </Dialog>
      <Dialog fullWidth maxWidth="sm" onClose={() => setOpen(false)} open={open}>
        <DialogTitle>Request leave</DialogTitle>
        <Stack component="form" onSubmit={(event) => void submit(event)}>
          <DialogContent>
            <Stack spacing={2}>
              <TextField label="Leave type" name="leaveType" required slotProps={{ htmlInput: { maxLength: 50 } }} />
              <TextField label="Start date" name="startsOn" required type="date" slotProps={{ inputLabel: { shrink: true } }} />
              <TextField label="End date" name="endsOn" required type="date" slotProps={{ inputLabel: { shrink: true } }} />
              <TextField label="Reason" multiline name="reason" />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Submit</Button>
          </DialogActions>
        </Stack>
      </Dialog>
    </Page>
  )
}

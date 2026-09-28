import {
  FormControl,
  InputLabel,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Stack,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material'
import { useState } from 'react'
import { ApiError } from '../../api/client'
import { useAuth } from '../../auth/authContext'
import { hasAnyPermission } from '../../auth/permission'
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../shared/components/StateViews'
import { REPORT_PERMISSIONS } from './permissions'
import { ReportPageFrame } from './ReportPageFrame'
import { useAppointmentReport, useDashboard } from './hooks'
import { personLabel } from './types'

const statuses = [
  'scheduled',
  'checked_in',
  'completed',
  'cancelled',
  'no_show',
] as const

export function AppointmentReportPage() {
  const { user } = useAuth()
  const dashboard = useDashboard(hasAnyPermission(user, REPORT_PERMISSIONS))
  const hospitalDate = dashboard.data?.hospitalDate ?? ''
  const [fromOverride, setFromOverride] = useState<string | null>(null)
  const [toOverride, setToOverride] = useState<string | null>(null)
  const from = fromOverride ?? hospitalDate
  const to = toOverride ?? hospitalDate
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')

  const query = useAppointmentReport(
    {
      page,
      pageSize: 20,
      from,
      to,
      ...(status ? { status } : {}),
    },
    Boolean(from && to),
  )

  return (
    <ReportPageFrame
      title="Appointment report"
      description="Appointments whose start time falls in the selected hospital-local dates. Clinical notes are omitted."
      onRefresh={() => void query.refetch()}
    >
      <Stack className="no-print" direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          slotProps={{ inputLabel: { shrink: true } }}
          label="From"
          onChange={(event) => {
            setFromOverride(event.target.value)
            setPage(1)
          }}
          type="date"
          value={from}
        />
        <TextField
          slotProps={{ inputLabel: { shrink: true } }}
          label="To"
          onChange={(event) => {
            setToOverride(event.target.value)
            setPage(1)
          }}
          type="date"
          value={to}
        />
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel id="appointment-report-status">Status</InputLabel>
          <Select
            label="Status"
            labelId="appointment-report-status"
            onChange={(event) => {
              setStatus(event.target.value)
              setPage(1)
            }}
            value={status}
          >
            <MenuItem value="">All statuses</MenuItem>
            {statuses.map((value) => (
              <MenuItem key={value} value={value}>{value}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>
      {query.isLoading && <LoadingState label="Loading appointment report" />}
      {query.isError && (
        <ErrorState
          message={query.error instanceof ApiError ? query.error.message : 'Appointment report could not be loaded.'}
          onRetry={() => void query.refetch()}
        />
      )}
      {query.data && query.data.data.length === 0 && (
        <EmptyState
          title="No appointments found"
          description="No appointments match the selected hospital-local date range."
        />
      )}
      {query.data && query.data.data.length > 0 && (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Starts</TableCell>
                  <TableCell>Ends</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Patient</TableCell>
                  <TableCell>Doctor</TableCell>
                  <TableCell>Department</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {query.data.data.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{new Date(row.startsAt).toLocaleString()}</TableCell>
                    <TableCell>{new Date(row.endsAt).toLocaleString()}</TableCell>
                    <TableCell>{row.status}</TableCell>
                    <TableCell>
                      {row.patient.patientNumber} · {personLabel(row.patient)}
                    </TableCell>
                    <TableCell>
                      {personLabel(row.doctor.employee)} ({row.doctor.specialization})
                    </TableCell>
                    <TableCell>{row.doctor.department.name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Pagination
            className="no-print"
            count={Math.max(query.data.pagination.totalPages, 1)}
            onChange={(_event, value) => setPage(value)}
            page={page}
            sx={{ alignSelf: 'center' }}
          />
        </>
      )}
    </ReportPageFrame>
  )
}

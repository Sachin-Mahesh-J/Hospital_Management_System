import { formatHospitalDateTime, hospitalToday } from '../../shared/datetime/hospitalTime'
import {
  FormControl,
  InputLabel,
  MenuItem,
  Pagination,
  Paper,
  Select,
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
import { FilterBar } from '../../shared/components/FilterBar'
import { filterControlSx } from '../../shared/components/layoutSx'
import { StatusChip } from '../../shared/components/StatusChip'
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../shared/components/StateViews'
import { REPORT_PERMISSIONS } from './permissions'
import { ReportPageFrame } from './ReportPageFrame'
import { useDashboard, useLaboratoryReport } from './hooks'
import { personLabel } from './types'

const statuses = [
  'requested',
  'sample_collected',
  'in_progress',
  'completed',
  'cancelled',
] as const

export function LaboratoryReportPage() {
  const { user } = useAuth()
  const dashboard = useDashboard(hasAnyPermission(user, REPORT_PERMISSIONS))
  const hospitalDate = dashboard.data?.hospitalDate ?? hospitalToday()
  const [fromOverride, setFromOverride] = useState<string | null>(null)
  const [toOverride, setToOverride] = useState<string | null>(null)
  const from = fromOverride ?? hospitalDate
  const to = toOverride ?? hospitalDate
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')

  const query = useLaboratoryReport(
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
      title="Laboratory report"
      description="Laboratory requests and test statuses for the selected dates."
      onRefresh={() => void query.refetch()}
    >
      <FilterBar>
        <TextField
          className="no-print"
          label="From"
          onChange={(event) => {
            setFromOverride(event.target.value)
            setPage(1)
          }}
          size="small"
          slotProps={{ inputLabel: { shrink: true } }}
          sx={filterControlSx}
          type="date"
          value={from}
        />
        <TextField
          className="no-print"
          label="To"
          onChange={(event) => {
            setToOverride(event.target.value)
            setPage(1)
          }}
          size="small"
          slotProps={{ inputLabel: { shrink: true } }}
          sx={filterControlSx}
          type="date"
          value={to}
        />
        <FormControl className="no-print" size="small" sx={filterControlSx}>
          <InputLabel id="lab-report-status">Status</InputLabel>
          <Select
            label="Status"
            labelId="lab-report-status"
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
      </FilterBar>
      {query.isLoading && <LoadingState label="Loading laboratory report" />}
      {query.isError && (
        <ErrorState
          message={query.error instanceof ApiError ? query.error.message : 'Laboratory report could not be loaded.'}
          onRetry={() => void query.refetch()}
        />
      )}
      {query.data && query.data.data.length === 0 && (
        <EmptyState
          title="No laboratory requests found"
          description="No laboratory requests match the selected dates."
        />
      )}
      {query.data && query.data.data.length > 0 && (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Requested</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Patient</TableCell>
                  <TableCell>Requested by</TableCell>
                  <TableCell>Tests</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {query.data.data.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{formatHospitalDateTime(row.requestedAt)}</TableCell>
                    <TableCell><StatusChip value={row.status} /></TableCell>
                    <TableCell>
                      {row.patient.patientNumber} · {personLabel(row.patient)}
                    </TableCell>
                    <TableCell>{personLabel(row.requestedBy.employee)}</TableCell>
                    <TableCell>
                      {row.items
                        .map((item) => `${item.testCode} (${item.status})`)
                        .join(', ')}
                    </TableCell>
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

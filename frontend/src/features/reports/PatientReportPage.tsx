import { formatHospitalDateTime } from '../../shared/datetime/hospitalTime'
import {
  FormControl,
  InputLabel,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material'
import { useState } from 'react'
import { ApiError } from '../../api/client'
import { FilterBar } from '../../shared/components/FilterBar'
import { filterControlSx } from '../../shared/components/layoutSx'
import { StatusChip } from '../../shared/components/StatusChip'
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../shared/components/StateViews'
import { ReportPageFrame } from './ReportPageFrame'
import { usePatientReport } from './hooks'
import { personLabel } from './types'

const statuses = ['active', 'inactive', 'deceased'] as const

export function PatientReportPage() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<string>('')
  const query = usePatientReport({
    page,
    pageSize: 20,
    ...(status ? { status } : {}),
  })

  return (
    <ReportPageFrame
      title="Patient report"
      description="Registered patients."
      onRefresh={() => void query.refetch()}
    >
      <FilterBar>
        <FormControl className="no-print" size="small" sx={filterControlSx}>
          <InputLabel id="patient-report-status">Status</InputLabel>
          <Select
            label="Status"
            labelId="patient-report-status"
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
      {query.isLoading && <LoadingState label="Loading patient report" />}
      {query.isError && (
        <ErrorState
          message={query.error instanceof ApiError ? query.error.message : 'Patient report could not be loaded.'}
          onRetry={() => void query.refetch()}
        />
      )}
      {query.data && query.data.data.length === 0 && (
        <EmptyState
          title="No patients found"
          description="No registered patients match the current filters."
        />
      )}
      {query.data && query.data.data.length > 0 && (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Patient number</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Date of birth</TableCell>
                  <TableCell>Sex</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Registered</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {query.data.data.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.patientNumber}</TableCell>
                    <TableCell>{personLabel(row)}</TableCell>
                    <TableCell>{row.dateOfBirth ?? 'Unknown'}</TableCell>
                    <TableCell>{row.sexAtRegistration ?? 'Not recorded'}</TableCell>
                    <TableCell><StatusChip value={row.status} /></TableCell>
                    <TableCell>{formatHospitalDateTime(row.createdAt)}</TableCell>
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

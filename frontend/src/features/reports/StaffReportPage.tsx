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
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../shared/components/StateViews'
import { StatusChip } from '../../shared/components/StatusChip'
import { ReportPageFrame } from './ReportPageFrame'
import { useStaffReport } from './hooks'
import { personLabel } from './types'

const statuses = ['active', 'inactive', 'terminated'] as const

export function StaffReportPage() {
  const [page, setPage] = useState(1)
  const [employmentStatus, setEmploymentStatus] = useState('')
  const query = useStaffReport({
    page,
    pageSize: 20,
    ...(employmentStatus ? { employmentStatus } : {}),
  })

  return (
    <ReportPageFrame
      title="Staff report"
      description="Employees, departments, and doctors."
      onRefresh={() => void query.refetch()}
    >
      <FilterBar>
        <FormControl className="no-print" size="small" sx={filterControlSx}>
          <InputLabel id="staff-status">Employment status</InputLabel>
          <Select
            label="Employment status"
            labelId="staff-status"
            onChange={(event) => {
              setEmploymentStatus(event.target.value)
              setPage(1)
            }}
            value={employmentStatus}
          >
            <MenuItem value="">All statuses</MenuItem>
            {statuses.map((value) => (
              <MenuItem key={value} value={value}>{value}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </FilterBar>
      {query.isLoading && <LoadingState label="Loading staff report" />}
      {query.isError && (
        <ErrorState
          message={query.error instanceof ApiError ? query.error.message : 'Staff report could not be loaded.'}
          onRetry={() => void query.refetch()}
        />
      )}
      {query.data && query.data.data.length === 0 && (
        <EmptyState
          title="No staff found"
          description="No employees match the current filters."
        />
      )}
      {query.data && query.data.data.length > 0 && (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Employee number</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Job title</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Doctor</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {query.data.data.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.employeeNumber}</TableCell>
                    <TableCell>{personLabel(row)}</TableCell>
                    <TableCell>{row.jobTitle}</TableCell>
                    <TableCell>{row.department.name}</TableCell>
                    <TableCell><StatusChip value={row.employmentStatus} /></TableCell>
                    <TableCell>
                      {row.doctorProfile
                        ? `${row.doctorProfile.specialization} (${row.doctorProfile.licenseNumber})`
                        : 'No'}
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

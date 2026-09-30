import { formatHospitalDateTime } from '../../shared/datetime/hospitalTime'
import {
  Button,
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
import { Link } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { Can } from '../../auth/Can'
import { useAuth } from '../../auth/authContext'
import { hasPermission } from '../../auth/permission'
import { FilterBar } from '../../shared/components/FilterBar'
import { filterControlSx } from '../../shared/components/layoutSx'
import { Page } from '../../shared/components/Page'
import { StatusChip } from '../../shared/components/StatusChip'
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../shared/components/StateViews'
import { useLabRequests } from './hooks'
import {
  labPatientLabel,
  labRequestStatuses,
  type LabRequestStatus,
} from './types'

export function LaboratoryListPage() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<LabRequestStatus | ''>('')
  const { user } = useAuth()
  const canCreateLabRequest = hasPermission(user, 'lab_request.create')
  const query = useLabRequests({
    page,
    pageSize: 20,
    ...(status ? { status } : {}),
  })

  return (
    <Page
      title="Laboratory"
      description="View laboratory requests, collection, results, and printable reports."
      actions={
        <Can permission="lab_request.create">
          <Button component={Link} to="/laboratory/new" variant="contained">
            New request
          </Button>
        </Can>
      }
    >
      <FilterBar>
        <FormControl size="small" sx={filterControlSx}>
          <InputLabel id="lab-status-filter">Status</InputLabel>
          <Select
            label="Status"
            labelId="lab-status-filter"
            onChange={(event) => {
              setStatus(event.target.value as LabRequestStatus | '')
              setPage(1)
            }}
            value={status}
          >
            <MenuItem value="">All statuses</MenuItem>
            {labRequestStatuses.map((value) => (
              <MenuItem key={value} value={value}>{value}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </FilterBar>
      {query.isLoading && <LoadingState label="Loading laboratory requests" />}
      {query.isError && (
        <ErrorState
          message={query.error instanceof ApiError ? query.error.message : 'Laboratory requests could not be loaded.'}
          onRetry={() => void query.refetch()}
        />
      )}
      {query.data && query.data.data.length === 0 && (
        <EmptyState
          action={
            canCreateLabRequest ? (
              <Button component={Link} to="/laboratory/new" variant="contained">
                New request
              </Button>
            ) : undefined
          }
          description={
            canCreateLabRequest
              ? 'Create a laboratory request or change the status filter. Collection and result entry are performed on the request detail page.'
              : 'No laboratory requests match the current filter.'
          }
          title="No laboratory requests found"
        />
      )}
      {query.data && query.data.data.length > 0 && (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Requested</TableCell>
                  <TableCell>Patient</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Tests</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {query.data.data.map((request) => (
                  <TableRow hover key={request.id}>
                    <TableCell>{formatHospitalDateTime(request.requestedAt)}</TableCell>
                    <TableCell>{labPatientLabel(request.patient)}</TableCell>
                    <TableCell><StatusChip value={request.status} /></TableCell>
                    <TableCell>{request.itemCount}</TableCell>
                    <TableCell align="right">
                      <Button component={Link} size="small" to={`/laboratory/${request.id}`}>
                        View
                      </Button>
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
    </Page>
  )
}

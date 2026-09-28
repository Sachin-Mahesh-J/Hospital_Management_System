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
import { Page } from '../../shared/components/Page'
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
  const query = useLabRequests({
    page,
    pageSize: 20,
    ...(status ? { status } : {}),
  })

  return (
    <Page
      title="Laboratory"
      description="View laboratory requests, collection, results, and printable reports. Billing and catalog administration are not part of this module."
      actions={
        <Can permission="lab_request.create">
          <Button component={Link} to="/laboratory/new" variant="contained">
            New request
          </Button>
        </Can>
      }
    >
      <FormControl sx={{ maxWidth: 280 }}>
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
      {query.isLoading && <LoadingState label="Loading laboratory requests" />}
      {query.isError && (
        <ErrorState
          message={query.error instanceof ApiError ? query.error.message : 'Laboratory requests could not be loaded.'}
          onRetry={() => void query.refetch()}
        />
      )}
      {query.data && query.data.data.length === 0 && (
        <EmptyState
          title="No laboratory requests found"
          description="Doctors create laboratory requests. Sample collection and result entry are performed by laboratory staff."
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
                    <TableCell>{new Date(request.requestedAt).toLocaleString()}</TableCell>
                    <TableCell>{labPatientLabel(request.patient)}</TableCell>
                    <TableCell>{request.status}</TableCell>
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

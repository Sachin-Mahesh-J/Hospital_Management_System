import {
  Button,
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
import { useAdmissions } from './hooks'
import {
  admissionStatuses,
  doctorLabel,
  patientLabel,
  type AdmissionStatus,
} from './types'

export function AdmissionListPage() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<AdmissionStatus | ''>('')
  const query = useAdmissions({
    page,
    pageSize: 20,
    ...(status ? { status } : {}),
  })

  return (
    <Page
      title="Admissions"
      description="Minimal inpatient admissions. Bed, ward, billing, and discharge actions are not part of this module for current roles."
      actions={
        <Can permission="admission.create">
          <Button component={Link} to="/admissions/new" variant="contained">
            Register admission
          </Button>
        </Can>
      }
    >
      <Paper sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="admission-status-filter">Status</InputLabel>
            <Select
              label="Status"
              labelId="admission-status-filter"
              onChange={(event) => {
                setStatus(event.target.value as AdmissionStatus | '')
                setPage(1)
              }}
              value={status}
            >
              <MenuItem value="">All statuses</MenuItem>
              {admissionStatuses.map((value) => (
                <MenuItem key={value} value={value}>{value}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {query.isLoading && <LoadingState label="Loading admissions" />}
      {query.isError && (
        <ErrorState
          message={query.error instanceof ApiError ? query.error.message : 'Admissions could not be loaded.'}
          onRetry={() => void query.refetch()}
        />
      )}
      {query.data && query.data.data.length === 0 && (
        <EmptyState
          title="No admissions found"
          description="Adjust the filter or register an admission."
        />
      )}
      {query.data && query.data.data.length > 0 && (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Admission number</TableCell>
                  <TableCell>Patient</TableCell>
                  <TableCell>Attending doctor</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Admitted</TableCell>
                  <TableCell>Discharged</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {query.data.data.map((admission) => (
                  <TableRow hover key={admission.id}>
                    <TableCell>{admission.admissionNumber}</TableCell>
                    <TableCell>{patientLabel(admission.patient)}</TableCell>
                    <TableCell>{doctorLabel(admission.attendingDoctor)}</TableCell>
                    <TableCell>{admission.status}</TableCell>
                    <TableCell>{new Date(admission.admittedAt).toLocaleString()}</TableCell>
                    <TableCell>
                      {admission.dischargedAt
                        ? new Date(admission.dischargedAt).toLocaleString()
                        : '—'}
                    </TableCell>
                    <TableCell align="right">
                      <Button component={Link} size="small" to={`/admissions/${admission.id}`}>
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

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
  const { user } = useAuth()
  const canRegisterAdmission = hasPermission(user, 'admission.create')
  const query = useAdmissions({
    page,
    pageSize: 20,
    ...(status ? { status } : {}),
  })

  return (
    <Page
      title="Admissions"
      description="Inpatient admissions."
      actions={
        <Can permission="admission.create">
          <Button component={Link} to="/admissions/new" variant="contained">
            Register admission
          </Button>
        </Can>
      }
    >
      <FilterBar>
          <FormControl size="small" sx={filterControlSx}>
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
      </FilterBar>

      {query.isLoading && <LoadingState label="Loading admissions" />}
      {query.isError && (
        <ErrorState
          message={query.error instanceof ApiError ? query.error.message : 'Admissions could not be loaded.'}
          onRetry={() => void query.refetch()}
        />
      )}
      {query.data && query.data.data.length === 0 && (
        <EmptyState
          action={
            canRegisterAdmission ? (
              <Button component={Link} to="/admissions/new" variant="contained">
                Register admission
              </Button>
            ) : undefined
          }
          description={
            canRegisterAdmission
              ? 'Adjust the status filter or register a new admission.'
              : 'No admissions match the current filter.'
          }
          title="No admissions found"
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
                    <TableCell><StatusChip value={admission.status} /></TableCell>
                    <TableCell>{formatHospitalDateTime(admission.admittedAt)}</TableCell>
                    <TableCell>
                      {admission.dischargedAt
                        ? formatHospitalDateTime(admission.dischargedAt)
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

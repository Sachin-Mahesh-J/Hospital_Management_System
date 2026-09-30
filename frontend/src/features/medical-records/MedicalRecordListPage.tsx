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
import { useMedicalRecords } from './hooks'
import {
  authorLabel,
  medicalRecordStatuses,
  patientRecordLabel,
  type MedicalRecordStatus,
} from './types'

export function MedicalRecordListPage() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<MedicalRecordStatus | ''>('')
  const { user } = useAuth()
  const canCreateRecord = hasPermission(user, 'medical_record.create')
  const query = useMedicalRecords({
    page,
    pageSize: 20,
    ...(status ? { status } : {}),
  })

  return (
    <Page
      title="Medical records"
      description="Clinical records, diagnoses, treatments, and reports. Finalized content is amended rather than overwritten."
      actions={
        <Can permission="medical_record.create">
          <Button component={Link} to="/medical-records/new" variant="contained">
            New medical record
          </Button>
        </Can>
      }
    >
      <FilterBar>
        <FormControl size="small" sx={filterControlSx}>
          <InputLabel id="medical-record-status-filter">Status</InputLabel>
          <Select
            label="Status"
            labelId="medical-record-status-filter"
            onChange={(event) => {
              setStatus(event.target.value as MedicalRecordStatus | '')
              setPage(1)
            }}
            value={status}
          >
            <MenuItem value="">All statuses</MenuItem>
            {medicalRecordStatuses.map((value) => (
              <MenuItem key={value} value={value}>{value}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </FilterBar>

      {query.isLoading && <LoadingState label="Loading medical records" />}
      {query.isError && (
        <ErrorState
          message={query.error instanceof ApiError ? query.error.message : 'Medical records could not be loaded.'}
          onRetry={() => void query.refetch()}
        />
      )}
      {query.data && query.data.data.length === 0 && (
        <EmptyState
          action={
            canCreateRecord ? (
              <Button component={Link} to="/medical-records/new" variant="contained">
                New medical record
              </Button>
            ) : undefined
          }
          description={
            canCreateRecord
              ? 'Adjust the status filter or create a draft medical record.'
              : 'No medical records match the current filter.'
          }
          title="No medical records found"
        />
      )}
      {query.data && query.data.data.length > 0 && (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Occurred</TableCell>
                  <TableCell>Patient</TableCell>
                  <TableCell>Author</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {query.data.data.map((record) => (
                  <TableRow hover key={record.id}>
                    <TableCell>{formatHospitalDateTime(record.occurredAt)}</TableCell>
                    <TableCell>{patientRecordLabel(record.patient)}</TableCell>
                    <TableCell>{authorLabel(record.author)}</TableCell>
                    <TableCell><StatusChip value={record.status} /></TableCell>
                    <TableCell align="right">
                      <Button component={Link} size="small" to={`/medical-records/${record.id}`}>
                        View
                      </Button>
                      <Can permission="medical_record.update">
                        {record.status === 'draft' && (
                          <Button component={Link} size="small" to={`/medical-records/${record.id}/edit`}>
                            Edit draft
                          </Button>
                        )}
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
    </Page>
  )
}

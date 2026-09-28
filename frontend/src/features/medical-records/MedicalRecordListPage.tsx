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
      <Paper sx={{ p: 2 }}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
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
      </Paper>

      {query.isLoading && <LoadingState label="Loading medical records" />}
      {query.isError && (
        <ErrorState
          message={query.error instanceof ApiError ? query.error.message : 'Medical records could not be loaded.'}
          onRetry={() => void query.refetch()}
        />
      )}
      {query.data && query.data.data.length === 0 && (
        <EmptyState
          title="No medical records found"
          description="Adjust the filters or create a draft medical record."
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
                    <TableCell>{new Date(record.occurredAt).toLocaleString()}</TableCell>
                    <TableCell>{patientRecordLabel(record.patient)}</TableCell>
                    <TableCell>{authorLabel(record.author)}</TableCell>
                    <TableCell>{record.status}</TableCell>
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

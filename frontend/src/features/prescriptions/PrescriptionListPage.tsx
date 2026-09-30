import { formatHospitalDateTime } from '../../shared/datetime/hospitalTime'
import {
  Button,
  Pagination,
  Paper,
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
import { Page } from '../../shared/components/Page'
import { StatusChip } from '../../shared/components/StatusChip'
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../shared/components/StateViews'
import { usePrescriptions } from './hooks'

export function PrescriptionListPage() {
  const [page, setPage] = useState(1)
  const query = usePrescriptions({ page, pageSize: 20 })

  return (
    <Page
      title="Prescriptions"
      description="View prescriptions, remaining quantities, and pharmacy dispensing where permitted."
    >
      {query.isLoading && <LoadingState label="Loading prescriptions" />}
      {query.isError && (
        <ErrorState
          message={query.error instanceof ApiError ? query.error.message : 'Prescriptions could not be loaded.'}
          onRetry={() => void query.refetch()}
        />
      )}
      {query.data && query.data.data.length === 0 && (
        <EmptyState
          description="Prescriptions appear here after they are created from finalized medical records."
          title="No prescriptions found"
        />
      )}
      {query.data && query.data.data.length > 0 && (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Prescribed</TableCell>
                  <TableCell>Patient</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Items</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {query.data.data.map((prescription) => (
                  <TableRow hover key={prescription.id}>
                    <TableCell>{formatHospitalDateTime(prescription.prescribedAt)}</TableCell>
                    <TableCell>
                      {prescription.patient.firstName} {prescription.patient.lastName}
                    </TableCell>
                    <TableCell><StatusChip value={prescription.status} /></TableCell>
                    <TableCell>{prescription.itemCount}</TableCell>
                    <TableCell align="right">
                      <Button component={Link} size="small" to={`/prescriptions/${prescription.id}`}>
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

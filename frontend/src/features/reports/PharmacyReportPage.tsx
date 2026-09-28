import {
  Card,
  CardContent,
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
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { ApiError } from '../../api/client'
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../shared/components/StateViews'
import { ReportPageFrame } from './ReportPageFrame'
import { usePharmacyReport } from './hooks'
import {
  isLowStockRow,
  type PharmacyReportSection,
} from './types'

export function PharmacyReportPage() {
  const [page, setPage] = useState(1)
  const [section, setSection] = useState<PharmacyReportSection>('low_stock')
  const query = usePharmacyReport({ page, pageSize: 20, section })

  return (
    <ReportPageFrame
      title="Pharmacy report"
      description="Low-stock medicines use current stock versus medicines.low_stock_threshold. Near-expiry batches expire within 30 hospital-local days and are not already expired. Expired remaining stock is counted separately."
      onRefresh={() => void query.refetch()}
    >
      <FormControl className="no-print" sx={{ maxWidth: 280 }}>
        <InputLabel id="pharmacy-section">Section</InputLabel>
        <Select
          label="Section"
          labelId="pharmacy-section"
          onChange={(event) => {
            setSection(event.target.value as PharmacyReportSection)
            setPage(1)
          }}
          value={section}
        >
          <MenuItem value="low_stock">Low stock</MenuItem>
          <MenuItem value="near_expiry">Near expiry</MenuItem>
        </Select>
      </FormControl>
      {query.isLoading && <LoadingState label="Loading pharmacy report" />}
      {query.isError && (
        <ErrorState
          message={query.error instanceof ApiError ? query.error.message : 'Pharmacy report could not be loaded.'}
          onRetry={() => void query.refetch()}
        />
      )}
      {query.data && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography color="text.secondary" variant="body2">Low-stock medicines</Typography>
              <Typography variant="h5">{query.data.summary.lowStockMedicineCount}</Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography color="text.secondary" variant="body2">Near-expiry batches</Typography>
              <Typography variant="h5">{query.data.summary.nearExpiryBatchCount}</Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography color="text.secondary" variant="body2">Expired batches with stock</Typography>
              <Typography variant="h5">{query.data.summary.expiredBatchCount}</Typography>
            </CardContent>
          </Card>
        </Stack>
      )}
      {query.data && query.data.data.length === 0 && (
        <EmptyState
          title="No pharmacy rows found"
          description={
            section === 'low_stock'
              ? 'No medicines currently have stock at or below a configured threshold greater than zero.'
              : 'No unexpired batches with remaining stock expire within 30 hospital-local days.'
          }
        />
      )}
      {query.data && query.data.data.length > 0 && section === 'low_stock' && (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Code</TableCell>
                  <TableCell>Medicine</TableCell>
                  <TableCell>Unit</TableCell>
                  <TableCell>Current stock</TableCell>
                  <TableCell>Threshold</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {query.data.data.filter(isLowStockRow).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.code}</TableCell>
                    <TableCell>{row.genericName}</TableCell>
                    <TableCell>{row.inventoryUnit}</TableCell>
                    <TableCell>{row.currentStock}</TableCell>
                    <TableCell>{row.lowStockThreshold}</TableCell>
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
      {query.data && query.data.data.length > 0 && section === 'near_expiry' && (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Expiry</TableCell>
                  <TableCell>Batch</TableCell>
                  <TableCell>Medicine</TableCell>
                  <TableCell>Available</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {query.data.data.map((row) => (
                  !isLowStockRow(row) && (
                    <TableRow key={row.id}>
                      <TableCell>{row.expiryDate}</TableCell>
                      <TableCell>{row.batchNumber}</TableCell>
                      <TableCell>{row.medicine.genericName}</TableCell>
                      <TableCell>
                        {row.availableQuantity} {row.medicine.inventoryUnit}
                      </TableCell>
                    </TableRow>
                  )
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

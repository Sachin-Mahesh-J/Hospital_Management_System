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
import { FilterBar } from '../../shared/components/FilterBar'
import { filterControlSx } from '../../shared/components/layoutSx'
import { CategoryChart } from '../../shared/components/CategoryChart'
import { MetricCard } from '../../shared/components/MetricCard'
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../shared/components/StateViews'
import { formatCalendarDate } from '../../shared/datetime/hospitalTime'
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
      description="Low-stock medicines and batches nearing expiry."
      onRefresh={() => void query.refetch()}
    >
      <FilterBar>
        <FormControl className="no-print" size="small" sx={filterControlSx}>
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
      </FilterBar>
      {query.isLoading && <LoadingState label="Loading pharmacy report" />}
      {query.isError && (
        <ErrorState
          message={query.error instanceof ApiError ? query.error.message : 'Pharmacy report could not be loaded.'}
          onRetry={() => void query.refetch()}
        />
      )}
      {query.data && (
        <Stack spacing={2}>
          <Typography variant="h6">Summary</Typography>
          <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap' }}>
            <MetricCard
              alert={query.data.summary.lowStockMedicineCount > 0}
              label="Low-stock medicines"
              value={String(query.data.summary.lowStockMedicineCount)}
            />
            <MetricCard
              alert={query.data.summary.nearExpiryBatchCount > 0}
              label="Near-expiry batches"
              value={String(query.data.summary.nearExpiryBatchCount)}
            />
            <MetricCard
              alert={query.data.summary.expiredBatchCount > 0}
              label="Expired batches with stock"
              value={String(query.data.summary.expiredBatchCount)}
            />
          </Stack>
          <Card>
            <CardContent>
              <CategoryChart
                data={[
                  { label: 'Low stock', value: query.data.summary.lowStockMedicineCount },
                  { label: 'Near expiry', value: query.data.summary.nearExpiryBatchCount },
                  { label: 'Expired with stock', value: query.data.summary.expiredBatchCount },
                ]}
                emptyMessage="No pharmacy alerts."
                title="Pharmacy alerts"
              />
            </CardContent>
          </Card>
        </Stack>
      )}
      {query.data && query.data.data.length === 0 && (
        <EmptyState
          title="No pharmacy rows found"
          description={
            section === 'low_stock'
              ? 'No medicines are at or below their low-stock threshold.'
              : 'No batches are nearing expiry.'
          }
        />
      )}
      {query.data && query.data.data.length > 0 && section === 'low_stock' && (
          <Stack spacing={1}>
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
        </Stack>
      )}
      {query.data && query.data.data.length > 0 && section === 'near_expiry' && (
          <Stack spacing={1}>
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
                      <TableCell>{formatCalendarDate(row.expiryDate)}</TableCell>
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
        </Stack>
      )}
    </ReportPageFrame>
  )
}

import { formatHospitalDateTime, hospitalToday } from '../../shared/datetime/hospitalTime'
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
  TextField,
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
import { useAuth } from '../../auth/authContext'
import { hasAnyPermission } from '../../auth/permission'
import { FilterBar } from '../../shared/components/FilterBar'
import { filterControlSx } from '../../shared/components/layoutSx'
import { CategoryChart } from '../../shared/components/CategoryChart'
import { MetricCard } from '../../shared/components/MetricCard'
import { formatStatusLabel } from '../../shared/components/formatStatusLabel'
import { StatusChip } from '../../shared/components/StatusChip'
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../shared/components/StateViews'
import { REPORT_PERMISSIONS } from './permissions'
import { ReportPageFrame } from './ReportPageFrame'
import { useDashboard, useRevenueReport } from './hooks'

const methods = ['cash', 'card', 'bank_transfer'] as const

export function RevenueReportPage() {
  const { user } = useAuth()
  const dashboard = useDashboard(hasAnyPermission(user, REPORT_PERMISSIONS))
  const hospitalDate = dashboard.data?.hospitalDate ?? hospitalToday()
  const [fromOverride, setFromOverride] = useState<string | null>(null)
  const [toOverride, setToOverride] = useState<string | null>(null)
  const from = fromOverride ?? hospitalDate
  const to = toOverride ?? hospitalDate
  const [page, setPage] = useState(1)
  const [method, setMethod] = useState('')

  const query = useRevenueReport(
    {
      page,
      pageSize: 20,
      from,
      to,
      ...(method ? { method } : {}),
    },
    Boolean(from && to),
  )

  return (
    <ReportPageFrame
      title="Revenue report"
      description="Recorded payments. Draft, unpaid, reversed, and void invoices are excluded."
      onRefresh={() => void query.refetch()}
    >
      <FilterBar>
        <TextField
          className="no-print"
          label="From"
          onChange={(event) => {
            setFromOverride(event.target.value)
            setPage(1)
          }}
          size="small"
          slotProps={{ inputLabel: { shrink: true } }}
          sx={filterControlSx}
          type="date"
          value={from}
        />
        <TextField
          className="no-print"
          label="To"
          onChange={(event) => {
            setToOverride(event.target.value)
            setPage(1)
          }}
          size="small"
          slotProps={{ inputLabel: { shrink: true } }}
          sx={filterControlSx}
          type="date"
          value={to}
        />
        <FormControl className="no-print" size="small" sx={filterControlSx}>
          <InputLabel id="revenue-method">Method</InputLabel>
          <Select
            label="Method"
            labelId="revenue-method"
            onChange={(event) => {
              setMethod(event.target.value)
              setPage(1)
            }}
            value={method}
          >
            <MenuItem value="">All methods</MenuItem>
            {methods.map((value) => (
              <MenuItem key={value} value={value}>{formatStatusLabel(value)}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </FilterBar>
      {query.isLoading && <LoadingState label="Loading revenue report" />}
      {query.isError && (
        <ErrorState
          message={query.error instanceof ApiError ? query.error.message : 'Revenue report could not be loaded.'}
          onRetry={() => void query.refetch()}
        />
      )}
      {query.data && (
        <Stack spacing={2}>
          <Typography variant="h6">Summary</Typography>
          <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap' }}>
            <MetricCard
              detail={`${query.data.summary.paymentCount} payments`}
              label="Total effective revenue"
              value={`${query.data.summary.totalAmount} ${query.data.summary.currency}`}
            />
            <MetricCard
              label="Payment count"
              value={String(query.data.summary.paymentCount)}
            />
          </Stack>
          <Card>
            <CardContent>
              <CategoryChart
                data={query.data.summary.byMethod.map((row) => ({
                  label: formatStatusLabel(row.method),
                  value: row.paymentCount,
                }))}
                emptyMessage="No payments in this range."
                title="Payments by method"
              />
            </CardContent>
          </Card>
        </Stack>
      )}
      {query.data && query.data.data.length === 0 && (
        <EmptyState
          title="No payments found"
          description="No recorded payments match this date range."
        />
      )}
      {query.data && query.data.data.length > 0 && (
        <Stack spacing={2}>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Paid at</TableCell>
                  <TableCell>Payment</TableCell>
                  <TableCell>Invoice</TableCell>
                  <TableCell>Patient number</TableCell>
                  <TableCell>Method</TableCell>
                  <TableCell align="right">Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {query.data.data.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{formatHospitalDateTime(row.paidAt)}</TableCell>
                    <TableCell>{row.paymentNumber}</TableCell>
                    <TableCell>{row.invoiceNumber}</TableCell>
                    <TableCell>{row.patientNumber}</TableCell>
                    <TableCell><StatusChip value={row.method} /></TableCell>
                    <TableCell align="right">
                      {row.amount} {row.currency}
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
        </Stack>
      )}
    </ReportPageFrame>
  )
}

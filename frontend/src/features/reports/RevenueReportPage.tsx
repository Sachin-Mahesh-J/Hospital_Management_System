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
  const hospitalDate = dashboard.data?.hospitalDate ?? ''
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
      description="Effective recorded payments against non-void invoices. Draft, unpaid, reversed, and void-invoice amounts are excluded. Patient names are omitted."
      onRefresh={() => void query.refetch()}
    >
      <Stack className="no-print" direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          slotProps={{ inputLabel: { shrink: true } }}
          label="From"
          onChange={(event) => {
            setFromOverride(event.target.value)
            setPage(1)
          }}
          type="date"
          value={from}
        />
        <TextField
          slotProps={{ inputLabel: { shrink: true } }}
          label="To"
          onChange={(event) => {
            setToOverride(event.target.value)
            setPage(1)
          }}
          type="date"
          value={to}
        />
        <FormControl sx={{ minWidth: 200 }}>
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
              <MenuItem key={value} value={value}>{value}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>
      {query.isLoading && <LoadingState label="Loading revenue report" />}
      {query.isError && (
        <ErrorState
          message={query.error instanceof ApiError ? query.error.message : 'Revenue report could not be loaded.'}
          onRetry={() => void query.refetch()}
        />
      )}
      {query.data && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography color="text.secondary" variant="body2">
                Total effective revenue
              </Typography>
              <Typography variant="h5">
                {query.data.summary.totalAmount} {query.data.summary.currency}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography color="text.secondary" variant="body2">
                Payment count
              </Typography>
              <Typography variant="h5">{query.data.summary.paymentCount}</Typography>
            </CardContent>
          </Card>
          {query.data.summary.byMethod.map((row) => (
            <Card key={row.method} sx={{ flex: 1 }}>
              <CardContent>
                <Typography color="text.secondary" variant="body2">
                  {row.method}
                </Typography>
                <Typography variant="h6">
                  {row.totalAmount} ({row.paymentCount})
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
      {query.data && query.data.data.length === 0 && (
        <EmptyState
          title="No effective payments found"
          description="No recorded, non-reversed payments against non-void invoices match this range."
        />
      )}
      {query.data && query.data.data.length > 0 && (
        <>
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
                    <TableCell>{new Date(row.paidAt).toLocaleString()}</TableCell>
                    <TableCell>{row.paymentNumber}</TableCell>
                    <TableCell>{row.invoiceNumber}</TableCell>
                    <TableCell>{row.patientNumber}</TableCell>
                    <TableCell>{row.method}</TableCell>
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
        </>
      )}
    </ReportPageFrame>
  )
}

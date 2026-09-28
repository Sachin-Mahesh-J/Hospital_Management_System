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
  TextField,
} from '@mui/material'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { Can } from '../../auth/Can'
import { Page } from '../../shared/components/Page'
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../shared/components/StateViews'
import { useInvoices } from './hooks'
import {
  invoiceStatuses,
  moneyLabel,
  patientLabel,
  type InvoiceStatus,
} from './types'

export function InvoiceListPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<InvoiceStatus | ''>('')
  const query = useInvoices({
    page,
    pageSize: 20,
    ...(search ? { search } : {}),
    ...(status ? { status } : {}),
  })

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setSearch(String(form.get('search') ?? '').trim())
    setPage(1)
  }

  return (
    <Page
      title="Billing"
      description="Invoices, payments, and receipts. Totals are calculated by the server. Admission billing, tax, and discounts are not enabled."
      actions={
        <Can permission="invoice.create">
          <Button component={Link} to="/billing/new" variant="contained">
            Create invoice
          </Button>
        </Can>
      }
    >
      <Paper sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <Stack component="form" direction="row" spacing={1} onSubmit={submitSearch} sx={{ flex: 1 }}>
            <TextField
              defaultValue={search}
              fullWidth
              label="Search by invoice or patient"
              name="search"
              size="small"
              slotProps={{ htmlInput: { maxLength: 200 } }}
            />
            <Button type="submit" variant="outlined">Search</Button>
          </Stack>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="invoice-status-filter">Status</InputLabel>
            <Select
              label="Status"
              labelId="invoice-status-filter"
              onChange={(event) => {
                setStatus(event.target.value as InvoiceStatus | '')
                setPage(1)
              }}
              value={status}
            >
              <MenuItem value="">All statuses</MenuItem>
              {invoiceStatuses.map((value) => (
                <MenuItem key={value} value={value}>{value}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Paper>
      {query.isLoading && <LoadingState label="Loading invoices" />}
      {query.isError && (
        <ErrorState
          message={query.error instanceof ApiError ? query.error.message : 'Invoices could not be loaded.'}
          onRetry={() => void query.refetch()}
        />
      )}
      {query.data && query.data.data.length === 0 && (
        <EmptyState
          title="No invoices found"
          description="Create a draft invoice from completed consultations, laboratory items, or pharmacy dispenses."
        />
      )}
      {query.data && query.data.data.length > 0 && (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Invoice</TableCell>
                  <TableCell>Patient</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Total</TableCell>
                  <TableCell>Balance</TableCell>
                  <TableCell>Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {query.data.data.map((invoice) => (
                  <TableRow key={invoice.id} hover>
                    <TableCell>
                      <Button component={Link} to={`/billing/${invoice.id}`} size="small">
                        {invoice.invoiceNumber}
                      </Button>
                    </TableCell>
                    <TableCell>{patientLabel(invoice.patient)}</TableCell>
                    <TableCell>{invoice.status}</TableCell>
                    <TableCell>{moneyLabel(invoice.totalAmount, invoice.currency)}</TableCell>
                    <TableCell>{moneyLabel(invoice.balanceAmount, invoice.currency)}</TableCell>
                    <TableCell>{new Date(invoice.createdAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {query.data.pagination.totalPages > 1 && (
            <Pagination
              count={query.data.pagination.totalPages}
              onChange={(_event, value) => setPage(value)}
              page={page}
            />
          )}
        </>
      )}
    </Page>
  )
}

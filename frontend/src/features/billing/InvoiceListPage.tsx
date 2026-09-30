import { formatHospitalDateTime } from '../../shared/datetime/hospitalTime'
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
  const { user } = useAuth()
  const canCreateInvoice = hasPermission(user, 'invoice.create')
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
      description="Invoices, payments, and receipts."
      actions={
        <Can permission="invoice.create">
          <Button component={Link} to="/billing/new" variant="contained">
            Create invoice
          </Button>
        </Can>
      }
    >
      <FilterBar>
          <Stack component="form" direction="row" spacing={1} onSubmit={submitSearch} sx={{ flex: '2 1 280px', minWidth: 0 }}>
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
          <FormControl size="small" sx={filterControlSx}>
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
      </FilterBar>
      {query.isLoading && <LoadingState label="Loading invoices" />}
      {query.isError && (
        <ErrorState
          message={query.error instanceof ApiError ? query.error.message : 'Invoices could not be loaded.'}
          onRetry={() => void query.refetch()}
        />
      )}
      {query.data && query.data.data.length === 0 && (
        <EmptyState
          action={
            canCreateInvoice ? (
              <Button component={Link} to="/billing/new" variant="contained">
                Create invoice
              </Button>
            ) : undefined
          }
          description={
            canCreateInvoice
              ? 'Create a draft invoice from completed consultations, laboratory items, or pharmacy dispenses.'
              : 'No invoices match the current search or status filter.'
          }
          title="No invoices found"
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
                    <TableCell><StatusChip value={invoice.status} /></TableCell>
                    <TableCell>{moneyLabel(invoice.totalAmount, invoice.currency)}</TableCell>
                    <TableCell>{moneyLabel(invoice.balanceAmount, invoice.currency)}</TableCell>
                    <TableCell>{formatHospitalDateTime(invoice.createdAt)}</TableCell>
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

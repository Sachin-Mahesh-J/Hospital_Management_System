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
import { useInventory } from './hooks'
import {
  batchStatuses,
  medicineLabel,
  type BatchStatus,
} from './types'

export function InventoryListPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<BatchStatus | ''>('')
  const query = useInventory({
    page,
    pageSize: 20,
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(status ? { status } : {}),
  })

  return (
    <Page
      title="Inventory"
      description="Pharmacy batches and derived available quantity. Movements are append-only. Catalog administration is not available here."
      actions={
        <Stack direction="row" spacing={1}>
          <Can permission="stock.receive">
            <Button component={Link} to="/pharmacy/inventory/receive" variant="contained">
              Receive stock
            </Button>
          </Can>
          <Can permission="stock.adjust">
            <Button component={Link} to="/pharmacy/inventory/adjust">
              Adjust stock
            </Button>
          </Can>
        </Stack>
      }
    >
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <TextField
          label="Search"
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
          sx={{ maxWidth: 320 }}
          value={search}
          slotProps={{ htmlInput: { 'aria-label': 'Search inventory' } }}
        />
        <FormControl sx={{ maxWidth: 240 }}>
          <InputLabel id="inventory-status-filter">Batch status</InputLabel>
          <Select
            label="Batch status"
            labelId="inventory-status-filter"
            onChange={(event) => {
              setStatus(event.target.value as BatchStatus | '')
              setPage(1)
            }}
            value={status}
          >
            <MenuItem value="">All statuses</MenuItem>
            {batchStatuses.map((value) => (
              <MenuItem key={value} value={value}>{value}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>
      {query.isLoading && <LoadingState label="Loading inventory" />}
      {query.isError && (
        <ErrorState
          message={query.error instanceof ApiError ? query.error.message : 'Inventory could not be loaded.'}
          onRetry={() => void query.refetch()}
        />
      )}
      {query.data && query.data.data.length === 0 && (
        <EmptyState
          title="No inventory batches found"
          description="Receive stock to create a batch. Available quantity is calculated from stock movements."
        />
      )}
      {query.data && query.data.data.length > 0 && (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Medicine</TableCell>
                  <TableCell>Batch</TableCell>
                  <TableCell>Expiry</TableCell>
                  <TableCell>Received</TableCell>
                  <TableCell>Available</TableCell>
                  <TableCell>Batch status</TableCell>
                  <TableCell>Medicine status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {query.data.data.map((batch) => (
                  <TableRow hover key={batch.id}>
                    <TableCell>{medicineLabel(batch.medicine)}</TableCell>
                    <TableCell>{batch.batchNumber}</TableCell>
                    <TableCell>{batch.expiryDate}</TableCell>
                    <TableCell>{batch.receivedQuantity} {batch.medicine.inventoryUnit}</TableCell>
                    <TableCell>{batch.availableQuantity} {batch.medicine.inventoryUnit}</TableCell>
                    <TableCell>{batch.status}</TableCell>
                    <TableCell>{batch.medicine.status}</TableCell>
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

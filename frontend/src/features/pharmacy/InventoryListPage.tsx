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
import { formatCalendarDate } from '../../shared/datetime/hospitalTime'
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
  const { user } = useAuth()
  const canReceiveStock = hasPermission(user, 'stock.receive')
  const query = useInventory({
    page,
    pageSize: 20,
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(status ? { status } : {}),
  })

  return (
    <Page
      title="Inventory"
      description="Pharmacy batches and available quantity."
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
      <FilterBar>
        <TextField
          label="Search"
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
          size="small"
          sx={{ ...filterControlSx, flex: '1 1 220px', maxWidth: { sm: 400 } }}
          value={search}
          slotProps={{ htmlInput: { 'aria-label': 'Search inventory' } }}
        />
        <FormControl size="small" sx={filterControlSx}>
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
      </FilterBar>
      {query.isLoading && <LoadingState label="Loading inventory" />}
      {query.isError && (
        <ErrorState
          message={query.error instanceof ApiError ? query.error.message : 'Inventory could not be loaded.'}
          onRetry={() => void query.refetch()}
        />
      )}
      {query.data && query.data.data.length === 0 && (
        <EmptyState
          action={
            canReceiveStock ? (
              <Button component={Link} to="/pharmacy/inventory/receive" variant="contained">
                Receive stock
              </Button>
            ) : undefined
          }
          description={
            canReceiveStock
              ? 'Receive stock to create a batch. Available quantity is calculated from stock movements.'
              : 'No inventory batches match the current filters.'
          }
          title="No inventory batches found"
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
                    <TableCell>{formatCalendarDate(batch.expiryDate)}</TableCell>
                    <TableCell>{batch.receivedQuantity} {batch.medicine.inventoryUnit}</TableCell>
                    <TableCell>{batch.availableQuantity} {batch.medicine.inventoryUnit}</TableCell>
                    <TableCell><StatusChip value={batch.status} /></TableCell>
                    <TableCell><StatusChip value={batch.medicine.status} /></TableCell>
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

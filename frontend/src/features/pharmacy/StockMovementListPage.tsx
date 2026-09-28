import {
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
import { ApiError } from '../../api/client'
import { Page } from '../../shared/components/Page'
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../shared/components/StateViews'
import { useStockMovements } from './hooks'
import {
  medicineLabel,
  stockMovementTypes,
  type StockMovementType,
} from './types'

export function StockMovementListPage() {
  const [page, setPage] = useState(1)
  const [movementType, setMovementType] = useState<StockMovementType | ''>('')
  const query = useStockMovements({
    page,
    pageSize: 20,
    ...(movementType ? { movementType } : {}),
  })

  return (
    <Page
      title="Stock movements"
      description="Append-only pharmacy ledger. Movements cannot be edited or deleted."
    >
      <FormControl sx={{ maxWidth: 280 }}>
        <InputLabel id="movement-type-filter">Movement type</InputLabel>
        <Select
          label="Movement type"
          labelId="movement-type-filter"
          onChange={(event) => {
            setMovementType(event.target.value as StockMovementType | '')
            setPage(1)
          }}
          value={movementType}
        >
          <MenuItem value="">All types</MenuItem>
          {stockMovementTypes.map((value) => (
            <MenuItem key={value} value={value}>{value}</MenuItem>
          ))}
        </Select>
      </FormControl>
      {query.isLoading && <LoadingState label="Loading stock movements" />}
      {query.isError && (
        <ErrorState
          message={query.error instanceof ApiError ? query.error.message : 'Stock movements could not be loaded.'}
          onRetry={() => void query.refetch()}
        />
      )}
      {query.data && query.data.data.length === 0 && (
        <EmptyState
          title="No stock movements found"
          description="Receipts, adjustments, dispenses, and reversals appear here after they are recorded."
        />
      )}
      {query.data && query.data.data.length > 0 && (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Occurred</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Medicine / batch</TableCell>
                  <TableCell>Quantity</TableCell>
                  <TableCell>Actor</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {query.data.data.map((movement) => (
                  <TableRow hover key={movement.id}>
                    <TableCell>{new Date(movement.occurredAt).toLocaleString()}</TableCell>
                    <TableCell>{movement.movementType}</TableCell>
                    <TableCell>
                      {medicineLabel(movement.medicineBatch.medicine)} / {movement.medicineBatch.batchNumber}
                    </TableCell>
                    <TableCell>{movement.quantity}</TableCell>
                    <TableCell>{movement.performedBy.username}</TableCell>
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

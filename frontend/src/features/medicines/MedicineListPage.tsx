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
import { useMedicines } from './hooks'
import { medicineStatuses, type MedicineStatus } from './types'

export function MedicineListPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<MedicineStatus | ''>('')
  const { user } = useAuth()
  const canCreateMedicine = hasPermission(user, 'medicine.create')
  const query = useMedicines({
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
      title="Medicines"
      description="Hospital medicine catalogue. Inactive medicines remain in historical prescriptions and stock records but cannot be newly prescribed, received, or dispensed."
      actions={
        <Can permission="medicine.create">
          <Button component={Link} to="/medicines/new" variant="contained">
            Create medicine
          </Button>
        </Can>
      }
    >
      <FilterBar>
          <Stack component="form" direction="row" spacing={1} onSubmit={submitSearch} sx={{ flex: '2 1 280px', minWidth: 0 }}>
            <TextField
              defaultValue={search}
              fullWidth
              label="Search by code, generic name, or brand"
              name="search"
              size="small"
              slotProps={{ htmlInput: { maxLength: 200 } }}
            />
            <Button type="submit" variant="outlined">Search</Button>
          </Stack>
          <FormControl size="small" sx={filterControlSx}>
            <InputLabel id="medicine-status-filter">Status</InputLabel>
            <Select
              label="Status"
              labelId="medicine-status-filter"
              onChange={(event) => {
                setStatus(event.target.value as MedicineStatus | '')
                setPage(1)
              }}
              value={status}
            >
              <MenuItem value="">All statuses</MenuItem>
              {medicineStatuses.map((value) => (
                <MenuItem key={value} value={value}>{value}</MenuItem>
              ))}
            </Select>
          </FormControl>
      </FilterBar>

      {query.isLoading && <LoadingState label="Loading medicines" />}
      {query.isError && (
        <ErrorState
          message={query.error instanceof ApiError ? query.error.message : 'Medicines could not be loaded.'}
          onRetry={() => void query.refetch()}
        />
      )}
      {query.data && query.data.data.length === 0 && (
        <EmptyState
          action={
            <Can permission="medicine.create">
              <Button component={Link} to="/medicines/new" variant="contained">
                Create medicine
              </Button>
            </Can>
          }
          title="No medicines found"
          description={
            canCreateMedicine
              ? 'Create a medicine catalogue entry to make medicines available for prescriptions and pharmacy operations.'
              : 'No medicines are currently available for the current filters.'
          }
        />
      )}
      {query.data && query.data.data.length > 0 && (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Code</TableCell>
                  <TableCell>Generic name</TableCell>
                  <TableCell>Form</TableCell>
                  <TableCell>Unit</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {query.data.data.map((medicine) => (
                  <TableRow hover key={medicine.id}>
                    <TableCell>{medicine.code}</TableCell>
                    <TableCell>{medicine.genericName}</TableCell>
                    <TableCell>{medicine.dosageForm}</TableCell>
                    <TableCell>{medicine.inventoryUnit}</TableCell>
                    <TableCell><StatusChip value={medicine.status} /></TableCell>
                    <TableCell align="right">
                      <Button component={Link} size="small" to={`/medicines/${medicine.id}`}>
                        View
                      </Button>
                      <Can permission="medicine.update">
                        <Button component={Link} size="small" to={`/medicines/${medicine.id}/edit`}>
                          Edit
                        </Button>
                      </Can>
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

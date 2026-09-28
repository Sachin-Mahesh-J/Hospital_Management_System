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
import { useDepartments } from './hooks'
import { departmentStatuses, type DepartmentStatus } from './types'

export function DepartmentListPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<DepartmentStatus | ''>('')
  const query = useDepartments({
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
      title="Departments"
      description="Search and manage hospital departments. Inactive departments keep existing employee assignments."
      actions={
        <Can permission="department.create">
          <Button component={Link} to="/departments/new" variant="contained">
            Create department
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
              slotProps={{ htmlInput: { maxLength: 200 } }}
              label="Search by code or name"
              name="search"
              size="small"
            />
            <Button type="submit" variant="outlined">Search</Button>
          </Stack>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="department-status-filter">Status</InputLabel>
            <Select
              label="Status"
              labelId="department-status-filter"
              onChange={(event) => {
                setStatus(event.target.value as DepartmentStatus | '')
                setPage(1)
              }}
              value={status}
            >
              <MenuItem value="">All statuses</MenuItem>
              {departmentStatuses.map((value) => (
                <MenuItem key={value} value={value}>{value}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {query.isLoading && <LoadingState label="Loading departments" />}
      {query.isError && (
        <ErrorState
          message={query.error instanceof ApiError ? query.error.message : 'Departments could not be loaded.'}
          onRetry={() => void query.refetch()}
        />
      )}
      {query.data && query.data.data.length === 0 && (
        <EmptyState
          title="No departments found"
          description="Adjust the search or status filter, or create a department."
        />
      )}
      {query.data && query.data.data.length > 0 && (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Code</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {query.data.data.map((department) => (
                  <TableRow hover key={department.id}>
                    <TableCell>{department.code}</TableCell>
                    <TableCell>{department.name}</TableCell>
                    <TableCell>{department.status}</TableCell>
                    <TableCell align="right">
                      <Button component={Link} size="small" to={`/departments/${department.id}`}>
                        View
                      </Button>
                      <Can permission="department.update">
                        <Button component={Link} size="small" to={`/departments/${department.id}/edit`}>
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

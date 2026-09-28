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
import { useDepartments } from '../departments/hooks'
import { useEmployees } from './hooks'
import { employmentStatuses, type EmploymentStatus } from './types'

export function EmployeeListPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [employmentStatus, setEmploymentStatus] = useState<EmploymentStatus | ''>('')
  const departments = useDepartments({ page: 1, pageSize: 100 })
  const query = useEmployees({
    page,
    pageSize: 20,
    ...(search ? { search } : {}),
    ...(departmentId ? { departmentId } : {}),
    ...(employmentStatus ? { employmentStatus } : {}),
  })

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setSearch(String(form.get('search') ?? '').trim())
    setPage(1)
  }

  return (
    <Page
      title="Employees"
      description="Register and update staff records. Employees are never deleted; use employment status instead."
      actions={
        <Can permission="employee.create">
          <Button component={Link} to="/employees/new" variant="contained">
            Register employee
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
              label="Search by number, name, phone, or email"
              name="search"
              size="small"
            />
            <Button type="submit" variant="outlined">Search</Button>
          </Stack>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="employee-department-filter">Department</InputLabel>
            <Select
              label="Department"
              labelId="employee-department-filter"
              onChange={(event) => {
                setDepartmentId(event.target.value)
                setPage(1)
              }}
              value={departmentId}
            >
              <MenuItem value="">All departments</MenuItem>
              {(departments.data?.data ?? []).map((department) => (
                <MenuItem key={department.id} value={department.id}>{department.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="employee-status-filter">Status</InputLabel>
            <Select
              label="Status"
              labelId="employee-status-filter"
              onChange={(event) => {
                setEmploymentStatus(event.target.value as EmploymentStatus | '')
                setPage(1)
              }}
              value={employmentStatus}
            >
              <MenuItem value="">All statuses</MenuItem>
              {employmentStatuses.map((value) => (
                <MenuItem key={value} value={value}>{value}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {query.isLoading && <LoadingState label="Loading employees" />}
      {query.isError && (
        <ErrorState
          message={query.error instanceof ApiError ? query.error.message : 'Employees could not be loaded.'}
          onRetry={() => void query.refetch()}
        />
      )}
      {query.data && query.data.data.length === 0 && (
        <EmptyState
          title="No employees found"
          description="Adjust the search or filters, or register an employee."
        />
      )}
      {query.data && query.data.data.length > 0 && (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Employee number</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Job title</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {query.data.data.map((employee) => (
                  <TableRow hover key={employee.id}>
                    <TableCell>{employee.employeeNumber}</TableCell>
                    <TableCell>{employee.firstName} {employee.lastName}</TableCell>
                    <TableCell>{employee.jobTitle}</TableCell>
                    <TableCell>{employee.department.name}</TableCell>
                    <TableCell>{employee.employmentStatus}</TableCell>
                    <TableCell align="right">
                      <Button component={Link} size="small" to={`/employees/${employee.id}`}>
                        View
                      </Button>
                      <Can permission="employee.update">
                        <Button component={Link} size="small" to={`/employees/${employee.id}/edit`}>
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

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
import { Page } from '../../shared/components/Page'
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../shared/components/StateViews'
import { useDepartments } from '../departments/hooks'
import { useDoctors } from './hooks'
import { doctorStatuses, type DoctorStatus } from './types'

export function DoctorListPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<DoctorStatus | ''>('')
  const [departmentId, setDepartmentId] = useState('')
  const { user } = useAuth()
  const canReadDepartments = hasPermission(user, 'department.read')
  const departments = useDepartments(
    { page: 1, pageSize: 100 },
    { enabled: canReadDepartments },
  )
  const query = useDoctors({
    page,
    pageSize: 20,
    ...(search ? { search } : {}),
    ...(status ? { status } : {}),
    ...(departmentId ? { departmentId } : {}),
  })

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setSearch(String(form.get('search') ?? '').trim())
    setPage(1)
  }

  return (
    <Page
      title="Doctors"
      description="Doctor profiles are linked to existing employees. Department comes from the employee assignment."
      actions={
        <Can permission="doctor.create">
          <Button component={Link} to="/doctors/new" variant="contained">
            Create doctor profile
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
              label="Search by name, number, license, or specialization"
              name="search"
              size="small"
            />
            <Button type="submit" variant="outlined">Search</Button>
          </Stack>
          {canReadDepartments && (
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="doctor-department-filter">Department</InputLabel>
            <Select
              label="Department"
              labelId="doctor-department-filter"
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
          )}
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="doctor-status-filter">Status</InputLabel>
            <Select
              label="Status"
              labelId="doctor-status-filter"
              onChange={(event) => {
                setStatus(event.target.value as DoctorStatus | '')
                setPage(1)
              }}
              value={status}
            >
              <MenuItem value="">All statuses</MenuItem>
              {doctorStatuses.map((value) => (
                <MenuItem key={value} value={value}>{value}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {query.isLoading && <LoadingState label="Loading doctors" />}
      {query.isError && (
        <ErrorState
          message={query.error instanceof ApiError ? query.error.message : 'Doctors could not be loaded.'}
          onRetry={() => void query.refetch()}
        />
      )}
      {query.data && query.data.data.length === 0 && (
        <EmptyState
          title="No doctors found"
          description="Adjust the search or filters, or create a doctor profile for an existing employee."
        />
      )}
      {query.data && query.data.data.length > 0 && (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>License</TableCell>
                  <TableCell>Specialization</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {query.data.data.map((doctor) => (
                  <TableRow hover key={doctor.id}>
                    <TableCell>{doctor.employee.firstName} {doctor.employee.lastName}</TableCell>
                    <TableCell>{doctor.licenseNumber}</TableCell>
                    <TableCell>{doctor.specialization}</TableCell>
                    <TableCell>{doctor.employee.department.name}</TableCell>
                    <TableCell>{doctor.status}</TableCell>
                    <TableCell align="right">
                      <Button component={Link} size="small" to={`/doctors/${doctor.id}`}>
                        View
                      </Button>
                      <Can permission="doctor.update">
                        <Button component={Link} size="small" to={`/doctors/${doctor.id}/edit`}>
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

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
import { usePatients } from './hooks'
import { patientStatuses, type PatientStatus } from './types'

export function PatientListPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<PatientStatus | ''>('')
  const { user } = useAuth()
  const canRegisterPatient = hasPermission(user, 'patient.create')
  const query = usePatients({
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
      title="Patients"
      description="Search and manage patient demographic records. Documents are managed from each patient's detail page."
      actions={
        <Can permission="patient.create">
          <Button component={Link} to="/patients/new" variant="contained">
            Register patient
          </Button>
        </Can>
      }
    >
      <FilterBar>
          <Stack component="form" direction="row" spacing={1} onSubmit={submitSearch} sx={{ flex: '2 1 280px', minWidth: 0 }}>
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
          <FormControl size="small" sx={filterControlSx}>
            <InputLabel id="patient-status-filter">Status</InputLabel>
            <Select
              label="Status"
              labelId="patient-status-filter"
              onChange={(event) => {
                setStatus(event.target.value as PatientStatus | '')
                setPage(1)
              }}
              value={status}
            >
              <MenuItem value="">All statuses</MenuItem>
              {patientStatuses.map((value) => (
                <MenuItem key={value} value={value}>{value}</MenuItem>
              ))}
            </Select>
          </FormControl>
      </FilterBar>

      {query.isLoading && <LoadingState label="Loading patients" />}
      {query.isError && (
        <ErrorState
          message={query.error instanceof ApiError ? query.error.message : 'Patients could not be loaded.'}
          onRetry={() => void query.refetch()}
        />
      )}
      {query.data && query.data.data.length === 0 && (
        <EmptyState
          action={
            <Can permission="patient.create">
              <Button component={Link} to="/patients/new" variant="contained">
                Register patient
              </Button>
            </Can>
          }
          title="No patients found"
          description={
            canRegisterPatient
              ? 'Adjust the search or status filter, or register a new patient.'
              : 'No patients match the current search or status filter.'
          }
        />
      )}
      {query.data && query.data.data.length > 0 && (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Patient number</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Date of birth</TableCell>
                  <TableCell>Sex</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {query.data.data.map((patient) => (
                  <TableRow hover key={patient.id}>
                    <TableCell>{patient.patientNumber}</TableCell>
                    <TableCell>{patient.firstName} {patient.lastName}</TableCell>
                    <TableCell>
                      {patient.dateOfBirth ?? 'Unknown'} ({patient.dateOfBirthPrecision})
                    </TableCell>
                    <TableCell>{patient.sexAtRegistration?.replace('_', ' ') ?? 'Not recorded'}</TableCell>
                    <TableCell>{patient.phone ?? 'Not recorded'}</TableCell>
                    <TableCell><StatusChip value={patient.status} /></TableCell>
                    <TableCell align="right">
                      <Button component={Link} size="small" to={`/patients/${patient.id}`}>
                        View
                      </Button>
                      <Can permission="patient.update">
                        <Button component={Link} size="small" to={`/patients/${patient.id}/edit`}>
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

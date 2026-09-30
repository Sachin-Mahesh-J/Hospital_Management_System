import { Button, Divider, Paper, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { Can } from '../../auth/Can'
import { Page, PageError, PageLoading } from '../../shared/components/Page'
import { StatusChip } from '../../shared/components/StatusChip'
import { formatCalendarDate } from '../../shared/datetime/hospitalTime'
import { useEmployee } from './hooks'

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Stack spacing={0.5}>
      <Typography color="text.secondary" variant="body2">{label}</Typography>
      {typeof value === 'string' || value == null ? (
        <Typography>{value || 'Not recorded'}</Typography>
      ) : (
        value
      )}
    </Stack>
  )
}

export function EmployeeDetailPage() {
  const { employeeId = '' } = useParams()
  const query = useEmployee(employeeId)

  if (query.isLoading) {
    return <PageLoading title="Employee" label="Loading employee information..." />
  }
  if (query.isError) {
    return (
      <PageError
        title="Employee"
        message={query.error instanceof ApiError ? query.error.message : 'Employee could not be loaded.'}
        onRetry={() => void query.refetch()}
      />
    )
  }
  if (!query.data) return null
  const employee = query.data

  return (
    <Page
      title={`${employee.firstName} ${employee.lastName}`}
      description={employee.employeeNumber}
      actions={
        <Stack direction="row" spacing={1}>
          <Button component={Link} to="/employees">Back to employees</Button>
          <Can permission="employee.update">
            <Button component={Link} to={`/employees/${employee.id}/edit`} variant="contained">
              Edit employee
            </Button>
          </Can>
        </Stack>
      }
    >
      <Paper sx={{ p: 3 }}>
        <Stack spacing={2.5}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={4}>
            <Detail label="Status" value={<StatusChip value={employee.employmentStatus} />} />
            <Detail label="Job title" value={employee.jobTitle} />
            <Detail label="Department" value={`${employee.department.name} (${employee.department.status})`} />
          </Stack>
          <Divider />
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={4}>
            <Detail label="Phone" value={employee.phone} />
            <Detail label="Email" value={employee.email} />
            <Detail label="Linked user" value={employee.userId} />
          </Stack>
          <Divider />
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={4}>
            <Detail label="Hire date" value={formatCalendarDate(employee.hireDate)} />
            <Detail label="End date" value={employee.endDate} />
          </Stack>
        </Stack>
      </Paper>
    </Page>
  )
}

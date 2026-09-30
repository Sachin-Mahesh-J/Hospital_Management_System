import { Button } from '@mui/material'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { Page, PageError, PageLoading } from '../../shared/components/Page'
import { useNotification } from '../../shared/notifications/notificationContext'
import { EmployeeForm } from './EmployeeForm'
import { useEmployee, useUpdateEmployee } from './hooks'
import type { EmployeeUpdate } from './types'

export function EmployeeEditPage() {
  const { employeeId = '' } = useParams()
  const employeeQuery = useEmployee(employeeId)
  const mutation = useUpdateEmployee(employeeId)
  const navigate = useNavigate()
  const { notify } = useNotification()

  if (employeeQuery.isLoading) {
    return <PageLoading title="Edit employee" label="Loading employee information..." />
  }
  if (employeeQuery.isError) {
    return (
      <PageError
        title="Edit employee"
        message={employeeQuery.error instanceof ApiError ? employeeQuery.error.message : 'Employee could not be loaded.'}
        onRetry={() => void employeeQuery.refetch()}
      />
    )
  }
  if (!employeeQuery.data) return null

  return (
    <Page
      title="Edit employee"
      description={`${employeeQuery.data.employeeNumber} — ${employeeQuery.data.firstName} ${employeeQuery.data.lastName}`}
      actions={<Button component={Link} to={`/employees/${employeeId}`}>Cancel</Button>}
    >
      <EmployeeForm
        allowStatus
        employee={employeeQuery.data}
        isPending={mutation.isPending}
        onSubmit={async (input) => {
          await mutation.mutateAsync(input as EmployeeUpdate)
          notify('Employee updated successfully.', 'success')
          navigate(`/employees/${employeeId}`, { replace: true })
        }}
        submitLabel="Save changes"
      />
    </Page>
  )
}

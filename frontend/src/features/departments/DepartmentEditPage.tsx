import { Button } from '@mui/material'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { Page, PageError, PageLoading } from '../../shared/components/Page'
import { useNotification } from '../../shared/notifications/notificationContext'
import { DepartmentForm } from './DepartmentForm'
import { useDepartment, useUpdateDepartment } from './hooks'
import type { DepartmentUpdate } from './types'

export function DepartmentEditPage() {
  const { departmentId = '' } = useParams()
  const departmentQuery = useDepartment(departmentId)
  const mutation = useUpdateDepartment(departmentId)
  const navigate = useNavigate()
  const { notify } = useNotification()

  if (departmentQuery.isLoading) {
    return <PageLoading title="Edit department" label="Loading department information..." />
  }
  if (departmentQuery.isError) {
    return (
      <PageError
        title="Edit department"
        message={departmentQuery.error instanceof ApiError ? departmentQuery.error.message : 'Department could not be loaded.'}
        onRetry={() => void departmentQuery.refetch()}
      />
    )
  }
  if (!departmentQuery.data) return null

  return (
    <Page
      title="Edit department"
      description={`${departmentQuery.data.code} — ${departmentQuery.data.name}`}
      actions={<Button component={Link} to={`/departments/${departmentId}`}>Cancel</Button>}
    >
      <DepartmentForm
        allowStatus
        department={departmentQuery.data}
        isPending={mutation.isPending}
        onSubmit={async (input) => {
          await mutation.mutateAsync(input as DepartmentUpdate)
          notify('Department updated successfully.', 'success')
          navigate(`/departments/${departmentId}`, { replace: true })
        }}
        submitLabel="Save changes"
      />
    </Page>
  )
}

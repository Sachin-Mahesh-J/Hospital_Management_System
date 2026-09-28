import { Button } from '@mui/material'
import { Link, useNavigate } from 'react-router-dom'
import { Page } from '../../shared/components/Page'
import { useNotification } from '../../shared/notifications/notificationContext'
import { DepartmentForm } from './DepartmentForm'
import { useCreateDepartment } from './hooks'
import type { DepartmentInput } from './types'

export function DepartmentCreatePage() {
  const mutation = useCreateDepartment()
  const navigate = useNavigate()
  const { notify } = useNotification()

  return (
    <Page
      title="Create department"
      description="Add a hospital department. Code and name must be unique."
      actions={<Button component={Link} to="/departments">Cancel</Button>}
    >
      <DepartmentForm
        isPending={mutation.isPending}
        onSubmit={async (input) => {
          const department = await mutation.mutateAsync(input as DepartmentInput)
          notify('Department created successfully.', 'success')
          navigate(`/departments/${department.id}`, { replace: true })
        }}
        submitLabel="Create department"
      />
    </Page>
  )
}

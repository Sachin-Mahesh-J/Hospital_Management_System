import { Button } from '@mui/material'
import { Link, useNavigate } from 'react-router-dom'
import { Page } from '../../shared/components/Page'
import { useNotification } from '../../shared/notifications/notificationContext'
import { EmployeeForm } from './EmployeeForm'
import { useCreateEmployee } from './hooks'
import type { EmployeeInput } from './types'

export function EmployeeRegisterPage() {
  const mutation = useCreateEmployee()
  const navigate = useNavigate()
  const { notify } = useNotification()

  return (
    <Page
      title="Register employee"
      description="Create a staff record. A unique interim employee number is assigned automatically."
      actions={<Button component={Link} to="/employees">Cancel</Button>}
    >
      <EmployeeForm
        isPending={mutation.isPending}
        onSubmit={async (input) => {
          const employee = await mutation.mutateAsync(input as EmployeeInput)
          notify('Employee registered successfully.', 'success')
          navigate(`/employees/${employee.id}`, { replace: true })
        }}
        submitLabel="Register employee"
      />
    </Page>
  )
}

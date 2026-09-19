import { Alert } from '@mui/material'
import { Outlet } from 'react-router-dom'
import { useAuth } from './authContext'
import { hasPermission } from './permission'

export function PermissionRoute({ permission }: { permission: string }) {
  const { user } = useAuth()
  if (!hasPermission(user, permission)) {
    return (
      <Alert severity="error">
        You are not authorized to access this page.
      </Alert>
    )
  }
  return <Outlet />
}

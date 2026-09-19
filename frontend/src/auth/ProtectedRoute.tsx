import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { LoadingState } from '../shared/components/StateViews'
import { useAuth } from './authContext'

export function ProtectedRoute() {
  const { user, isBootstrapping } = useAuth()
  const location = useLocation()

  if (isBootstrapping) {
    return <LoadingState label="Restoring your session" />
  }

  if (!user) {
    return <Navigate replace state={{ from: location }} to="/login" />
  }

  return <Outlet />
}

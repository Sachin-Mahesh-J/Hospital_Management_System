import type { ReactNode } from 'react'
import { useAuth } from './authContext'
import { hasPermission } from './permission'

type CanProps = {
  permission: string
  children: ReactNode
  fallback?: ReactNode
}

export function Can({
  permission,
  children,
  fallback = null,
}: CanProps) {
  const { user } = useAuth()
  return hasPermission(user, permission) ? children : fallback
}

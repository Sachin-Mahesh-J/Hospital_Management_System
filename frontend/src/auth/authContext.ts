import { createContext, useContext } from 'react'
import type { CurrentUser } from '../api/auth'

export type AuthContextValue = {
  user: CurrentUser | null
  isBootstrapping: boolean
  login(username: string, password: string): Promise<void>
  logout(): Promise<void>
  changePassword(currentPassword: string, newPassword: string): Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.')
  }
  return context
}

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import {
  changePassword as changePasswordRequest,
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  refresh,
  type CurrentUser,
} from '../api/auth'
import {
  setAccessToken,
  setAuthExpirationHandler,
} from '../api/client'
import { AuthContext, type AuthContextValue } from './authContext'

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [isBootstrapping, setIsBootstrapping] = useState(true)

  useEffect(() => {
    setAuthExpirationHandler(() => {
      setUser(null)
    })

    let active = true
    void refresh()
      .then(() => getCurrentUser())
      .then((currentUser) => {
        if (active) {
          setUser(currentUser)
        }
      })
      .catch(() => {
        setAccessToken(null)
        if (active) {
          setUser(null)
        }
      })
      .finally(() => {
        if (active) {
          setIsBootstrapping(false)
        }
      })

    return () => {
      active = false
      setAuthExpirationHandler(null)
    }
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    await loginRequest(username, password)
    const currentUser = await getCurrentUser()
    setUser(currentUser)
  }, [])

  const logout = useCallback(async () => {
    try {
      await logoutRequest()
    } finally {
      setUser(null)
    }
  }, [])

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      await changePasswordRequest(currentPassword, newPassword)
      setAccessToken(null)
      setUser(null)
    },
    [],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isBootstrapping,
      login,
      logout,
      changePassword,
    }),
    [changePassword, isBootstrapping, login, logout, user],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}

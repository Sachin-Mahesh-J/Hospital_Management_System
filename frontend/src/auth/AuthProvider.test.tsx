import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getCurrentUser,
  refresh,
  type CurrentUser,
} from '../api/auth'
import { setAuthExpirationHandler } from '../api/client'
import { AuthProvider } from './AuthProvider'
import { useAuth } from './authContext'

vi.mock('../api/auth', () => ({
  changePassword: vi.fn(),
  getCurrentUser: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock('../api/client', () => ({
  setAccessToken: vi.fn(),
  setAuthExpirationHandler: vi.fn(),
}))

const currentUser: CurrentUser = {
  id: 'user-1',
  username: 'admin',
  roles: ['ADMIN'],
  permissions: ['user:manage'],
}

function AuthState() {
  const { user, isBootstrapping } = useAuth()
  if (isBootstrapping) {
    return <span>Bootstrapping</span>
  }
  return <span>{user?.username ?? 'Anonymous'}</span>
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('bootstraps in refresh-then-me order', async () => {
    const calls: string[] = []
    vi.mocked(refresh).mockImplementation(async () => {
      calls.push('refresh')
      return 'access-token'
    })
    vi.mocked(getCurrentUser).mockImplementation(async () => {
      calls.push('me')
      return currentUser
    })

    render(
      <AuthProvider>
        <AuthState />
      </AuthProvider>,
    )

    expect(screen.getByText('Bootstrapping')).toBeVisible()
    expect(await screen.findByText('admin')).toBeVisible()
    expect(calls).toEqual(['refresh', 'me'])
  })

  it('moves to anonymous state when terminal expiration is reported', async () => {
    vi.mocked(refresh).mockResolvedValue('access-token')
    vi.mocked(getCurrentUser).mockResolvedValue(currentUser)

    render(
      <AuthProvider>
        <AuthState />
      </AuthProvider>,
    )
    expect(await screen.findByText('admin')).toBeVisible()

    const expirationHandler = vi.mocked(setAuthExpirationHandler).mock.calls
      .find(([handler]) => handler !== null)?.[0]
    expirationHandler?.()

    expect(await screen.findByText('Anonymous')).toBeVisible()
  })
})

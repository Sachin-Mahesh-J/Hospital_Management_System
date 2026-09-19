import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../auth/authContext'
import { LoginPage } from './LoginPage'

describe('LoginPage', () => {
  it('submits credentials from the form', async () => {
    const login = vi.fn().mockResolvedValue(undefined)
    const authValue: AuthContextValue = {
      user: null,
      isBootstrapping: false,
      login,
      logout: async () => undefined,
      changePassword: async () => undefined,
    }

    render(
      <AuthContext value={authValue}>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </AuthContext>,
    )

    fireEvent.change(screen.getByLabelText(/Username/), {
      target: { value: 'admin' },
    })
    fireEvent.change(screen.getByLabelText(/Password/), {
      target: { value: 'secret-password' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(login).toHaveBeenCalledWith('admin', 'secret-password')
  })
})

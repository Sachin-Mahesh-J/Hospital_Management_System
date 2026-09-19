import { Button } from '@mui/material'
import { fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AuthContext, type AuthContextValue } from '../auth/authContext'
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../shared/components/StateViews'
import {
  useNotification,
} from '../shared/notifications/notificationContext'
import { NotificationProvider } from '../shared/notifications/NotificationProvider'
import { appRoutes } from './routes'

const authenticatedUser = {
  id: 'user-1',
  username: 'clinician',
  roles: ['CLINICIAN'],
  permissions: ['patient:read'],
}

const authValue: AuthContextValue = {
  user: authenticatedUser,
  isBootstrapping: false,
  login: async () => undefined,
  logout: async () => undefined,
  changePassword: async () => undefined,
}

describe('application routing', () => {
  it('renders the not-found state inside the application shell', async () => {
    const router = createMemoryRouter(appRoutes, {
      initialEntries: ['/not-implemented'],
    })

    render(
      <AuthContext value={authValue}>
        <RouterProvider router={router} />
      </AuthContext>,
    )

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeVisible()
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeVisible()
  })
})

describe('shared application states', () => {
  it('renders an accessible loading state', () => {
    render(<LoadingState label="Loading records" />)

    expect(screen.getByRole('status')).toHaveTextContent('Loading records')
  })

  it('renders retryable errors and empty states', () => {
    let retried = false
    const { rerender } = render(
      <ErrorState message="Unable to load" onRetry={() => { retried = true }} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(retried).toBe(true)

    rerender(
      <EmptyState
        description="No results match the current filters."
        title="No results"
      />,
    )
    expect(screen.getByRole('heading', { name: 'No results' })).toBeVisible()
  })
})

function NotificationHarness() {
  const { notify } = useNotification()
  return <Button onClick={() => notify('Saved successfully.', 'success')}>Notify</Button>
}

describe('notifications', () => {
  it('shows messages through the shared notification provider', async () => {
    render(
      <NotificationProvider>
        <NotificationHarness />
      </NotificationProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Notify' }))

    expect(await screen.findByText('Saved successfully.')).toBeVisible()
  })
})

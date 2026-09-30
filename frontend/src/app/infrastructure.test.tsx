import { Button } from '@mui/material'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AuthContext, type AuthContextValue } from '../auth/authContext'
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../shared/components/StateViews'
import { ContextHelp } from '../shared/components/ContextHelp'
import {
  useNotification,
} from '../shared/notifications/notificationContext'
import { NotificationProvider } from '../shared/notifications/NotificationProvider'
import { AppShell } from './AppShell'
import { appRoutes } from './routes'

const authenticatedUser = {
  id: 'user-1',
  username: 'clinician',
  roles: ['doctor'],
  permissions: ['patient.read'],
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

  it('blocks organization routes when the required permission is absent', async () => {
    const router = createMemoryRouter(appRoutes, {
      initialEntries: ['/departments'],
    })
    render(
      <AuthContext value={{
        ...authValue,
        user: { ...authenticatedUser, permissions: [] },
      }}>
        <RouterProvider router={router} />
      </AuthContext>,
    )
    expect(
      await screen.findByText('You are not authorized to access this page.'),
    ).toBeVisible()
  })

  it('blocks appointment routes when the required permission is absent', async () => {
    const router = createMemoryRouter(appRoutes, {
      initialEntries: ['/appointments'],
    })
    render(
      <AuthContext value={{
        ...authValue,
        user: { ...authenticatedUser, permissions: [] },
      }}>
        <RouterProvider router={router} />
      </AuthContext>,
    )
    expect(
      await screen.findByText('You are not authorized to access this page.'),
    ).toBeVisible()
  })

  it('blocks medical-record routes when the required permission is absent', async () => {
    const router = createMemoryRouter(appRoutes, {
      initialEntries: ['/medical-records'],
    })
    render(
      <AuthContext value={{
        ...authValue,
        user: { ...authenticatedUser, permissions: [] },
      }}>
        <RouterProvider router={router} />
      </AuthContext>,
    )
    expect(
      await screen.findByText('You are not authorized to access this page.'),
    ).toBeVisible()
  })

  it('blocks prescription routes when the required permission is absent', async () => {
    const router = createMemoryRouter(appRoutes, {
      initialEntries: ['/prescriptions'],
    })
    render(
      <AuthContext value={{
        ...authValue,
        user: { ...authenticatedUser, permissions: [] },
      }}>
        <RouterProvider router={router} />
      </AuthContext>,
    )
    expect(
      await screen.findByText('You are not authorized to access this page.'),
    ).toBeVisible()
  })

  it('blocks laboratory routes when the required permission is absent', async () => {
    const router = createMemoryRouter(appRoutes, {
      initialEntries: ['/laboratory'],
    })
    render(
      <AuthContext value={{
        ...authValue,
        user: { ...authenticatedUser, permissions: [] },
      }}>
        <RouterProvider router={router} />
      </AuthContext>,
    )
    expect(
      await screen.findByText('You are not authorized to access this page.'),
    ).toBeVisible()
  })

  it('blocks medicine catalogue routes when the required permission is absent', async () => {
    const router = createMemoryRouter(appRoutes, {
      initialEntries: ['/medicines'],
    })
    render(
      <AuthContext value={{
        ...authValue,
        user: { ...authenticatedUser, permissions: [] },
      }}>
        <RouterProvider router={router} />
      </AuthContext>,
    )
    expect(
      await screen.findByText('You are not authorized to access this page.'),
    ).toBeVisible()
  })

  it('blocks pharmacy inventory and receiving routes when the required permission is absent', async () => {
    for (const path of ['/pharmacy/inventory', '/pharmacy/inventory/receive', '/pharmacy/movements']) {
      const router = createMemoryRouter(appRoutes, {
        initialEntries: [path],
      })
      const { unmount } = render(
        <AuthContext value={{
          ...authValue,
          user: { ...authenticatedUser, permissions: [] },
        }}>
          <RouterProvider router={router} />
        </AuthContext>,
      )
      expect(
        await screen.findByText('You are not authorized to access this page.'),
      ).toBeVisible()
      unmount()
    }
  })

  it('blocks billing routes when the required permission is absent', async () => {
    const router = createMemoryRouter(appRoutes, {
      initialEntries: ['/billing'],
    })
    render(
      <AuthContext value={{
        ...authValue,
        user: { ...authenticatedUser, permissions: [] },
      }}>
        <RouterProvider router={router} />
      </AuthContext>,
    )
    expect(
      await screen.findByText('You are not authorized to access this page.'),
    ).toBeVisible()
  })

  it('blocks attendance, leave, user, and audit routes when permission is absent', async () => {
    for (const path of ['/attendance', '/leave', '/users', '/audit']) {
      const router = createMemoryRouter(appRoutes, {
        initialEntries: [path],
      })
      const { unmount } = render(
        <AuthContext value={{
          ...authValue,
          user: { ...authenticatedUser, permissions: [] },
        }}>
          <RouterProvider router={router} />
        </AuthContext>,
      )
      expect(
        await screen.findByText('You are not authorized to access this page.'),
      ).toBeVisible()
      unmount()
    }
  })

  it('blocks patient routes when the required permission is absent', async () => {
    const router = createMemoryRouter(appRoutes, {
      initialEntries: ['/patients'],
    })
    render(
      <AuthContext value={{
        ...authValue,
        user: { ...authenticatedUser, permissions: [] },
      }}>
        <RouterProvider router={router} />
      </AuthContext>,
    )
    expect(
      await screen.findByText('You are not authorized to access this page.'),
    ).toBeVisible()
  })

  it('redirects unauthenticated patient routes to login', async () => {
    const router = createMemoryRouter(appRoutes, {
      initialEntries: ['/patients'],
    })
    render(
      <AuthContext value={{ ...authValue, user: null }}>
        <RouterProvider router={router} />
      </AuthContext>,
    )
    expect(await screen.findByRole('heading', { name: 'Sign in to HMS' })).toBeVisible()
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

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
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

describe('contextual help', () => {
  it('does not place help controls on sidebar navigation', () => {
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <AuthContext value={authValue}>
          <MemoryRouter>
            <AppShell />
          </MemoryRouter>
        </AuthContext>
      </QueryClientProvider>,
    )

    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Patients' })).toBeVisible()
    expect(screen.queryByRole('button', { name: /More information about/ })).not.toBeInTheDocument()
  })

  it('opens retained help from a subtle information control', () => {
    render(
      <ContextHelp
        description="Voiding marks the invoice void with a reason; it does not delete line items."
        label="invoice voiding"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'More information about invoice voiding' }))
    expect(screen.getByRole('dialog', { name: 'More information about invoice voiding' })).toHaveTextContent(
      'Voiding marks the invoice void with a reason; it does not delete line items.',
    )
  })
})

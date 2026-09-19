import { CssBaseline, ThemeProvider } from '@mui/material'
import type { PropsWithChildren } from 'react'
import { AuthProvider } from '../auth/AuthProvider'
import { NotificationProvider } from '../shared/notifications/NotificationProvider'
import { theme } from './theme'

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <NotificationProvider>
        <AuthProvider>{children}</AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  )
}

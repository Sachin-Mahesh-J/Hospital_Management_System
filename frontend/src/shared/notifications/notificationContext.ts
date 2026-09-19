import { createContext, useContext } from 'react'

export type NotificationSeverity = 'success' | 'info' | 'warning' | 'error'

export type NotificationContextValue = {
  notify(message: string, severity?: NotificationSeverity): void
}

export const NotificationContext =
  createContext<NotificationContextValue | null>(null)

export function useNotification(): NotificationContextValue {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider.')
  }
  return context
}

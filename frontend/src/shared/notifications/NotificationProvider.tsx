import { Alert, Snackbar } from '@mui/material'
import {
  useCallback,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import {
  NotificationContext,
  type NotificationSeverity,
} from './notificationContext'

type Notification = {
  message: string
  severity: NotificationSeverity
}

export function NotificationProvider({ children }: PropsWithChildren) {
  const [notification, setNotification] = useState<Notification | null>(null)

  const notify = useCallback(
    (message: string, severity: NotificationSeverity = 'info') => {
      setNotification({ message, severity })
    },
    [],
  )
  const contextValue = useMemo(() => ({ notify }), [notify])

  return (
    <NotificationContext value={contextValue}>
      {children}
      <Snackbar
        autoHideDuration={5000}
        onClose={() => setNotification(null)}
        open={notification !== null}
      >
        <Alert
          onClose={() => setNotification(null)}
          severity={notification?.severity ?? 'info'}
          variant="filled"
        >
          {notification?.message}
        </Alert>
      </Snackbar>
    </NotificationContext>
  )
}

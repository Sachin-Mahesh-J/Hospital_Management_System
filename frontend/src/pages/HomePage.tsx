import { Alert, Button } from '@mui/material'
import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../api/client'
import { getHealth, type HealthResponse } from '../api/health'
import { useAuth } from '../auth/authContext'
import { hasAnyPermission } from '../auth/permission'
import { DashboardMetrics } from '../features/reports/DashboardMetrics'
import { REPORT_PERMISSIONS } from '../features/reports/permissions'
import { Page } from '../shared/components/Page'
import {
  ErrorState,
  LoadingState,
} from '../shared/components/StateViews'
import { useNotification } from '../shared/notifications/notificationContext'

function errorMessage(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : 'The API health check could not be completed.'
}

export function HomePage() {
  const { user } = useAuth()
  const showDashboard = hasAnyPermission(user, REPORT_PERMISSIONS)
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { notify } = useNotification()

  const checkApi = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await getHealth()
      setHealth(response)
      notify('API connection verified.', 'success')
    } catch (caughtError: unknown) {
      setHealth(null)
      setError(errorMessage(caughtError))
    } finally {
      setIsLoading(false)
    }
  }, [notify])

  useEffect(() => {
    let active = true

    void getHealth()
      .then((response) => {
        if (active) {
          setHealth(response)
        }
      })
      .catch((caughtError: unknown) => {
        if (active) {
          setError(errorMessage(caughtError))
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  return (
    <Page
      actions={
        <Button disabled={isLoading} onClick={() => void checkApi()} variant="contained">
          Check API
        </Button>
      }
      description="Authorized operational metrics use hospital-local dates. Metrics you cannot access are not shown."
      title="Dashboard"
    >
      <DashboardMetrics enabled={showDashboard} />
      {isLoading && <LoadingState label="Checking API status" />}
      {!isLoading && error && (
        <ErrorState message={error} onRetry={() => void checkApi()} />
      )}
      {!isLoading && health && (
        <Alert severity="success">
          API connected: {health.service} is {health.status}.
        </Alert>
      )}
    </Page>
  )
}

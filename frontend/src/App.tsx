import { Alert, Button, CircularProgress, Stack, Typography } from '@mui/material'
import { useCallback, useEffect, useState } from 'react'
import { ApiError, getHealth, type HealthResponse } from './api/client'
import { AppShell } from './app/AppShell'

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const checkApi = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      setHealth(await getHealth())
    } catch (caughtError) {
      setHealth(null)
      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : 'The API health check could not be completed.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

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
          setError(
            caughtError instanceof ApiError
              ? caughtError.message
              : 'The API health check could not be completed.',
          )
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
    <AppShell>
      <Stack spacing={3}>
        <div>
          <Typography component="h1" variant="h4" gutterBottom>
            Hospital Management System
          </Typography>
          <Typography color="text.secondary">
            Milestone 1 application foundation
          </Typography>
        </div>

        {isLoading && <CircularProgress aria-label="Checking API status" />}
        {health && (
          <Alert severity="success">
            API connected: {health.service} is {health.status}.
          </Alert>
        )}
        {error && <Alert severity="error">{error}</Alert>}

        <Button
          disabled={isLoading}
          onClick={() => void checkApi()}
          sx={{ alignSelf: 'flex-start' }}
          variant="contained"
        >
          Check API
        </Button>
      </Stack>
    </AppShell>
  )
}

export default App

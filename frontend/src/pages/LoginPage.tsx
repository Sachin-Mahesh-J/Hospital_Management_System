import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useState, type FormEvent } from 'react'
import {
  Navigate,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/authContext'

type LoginLocationState = {
  from?: {
    pathname?: string
    search?: string
  }
}

export function LoginPage() {
  const { user, login } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (user) {
    return <Navigate replace to="/" />
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const username = String(form.get('username') ?? '')
    const password = String(form.get('password') ?? '')

    try {
      await login(username, password)
      const state = location.state as LoginLocationState | null
      const destination = state?.from?.pathname
        ? `${state.from.pathname}${state.from.search ?? ''}`
        : '/'
      navigate(destination, { replace: true })
    } catch (caught: unknown) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'Sign in could not be completed.',
      )
    } finally {
      const passwordInput =
        formElement.elements.namedItem('password')
      if (passwordInput instanceof HTMLInputElement) {
        passwordInput.value = ''
      }
      setIsSubmitting(false)
    }
  }

  return (
    <Box sx={{ display: 'grid', minHeight: '100vh', placeItems: 'center', p: 2 }}>
      <Paper elevation={3} sx={{ maxWidth: 420, p: 4, width: '100%' }}>
        <Stack
          component="form"
          onSubmit={(event) => void handleSubmit(event)}
          spacing={3}
        >
          <Box>
            <Typography component="h1" variant="h4">
              Sign in to HMS
            </Typography>
            <Typography color="text.secondary">
              Use your hospital account to continue.
            </Typography>
          </Box>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            autoComplete="username"
            autoFocus
            disabled={isSubmitting}
            label="Username"
            name="username"
            required
          />
          <TextField
            autoComplete="current-password"
            disabled={isSubmitting}
            label="Password"
            name="password"
            required
            type="password"
          />
          <Button disabled={isSubmitting} type="submit" variant="contained">
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </Stack>
      </Paper>
    </Box>
  )
}

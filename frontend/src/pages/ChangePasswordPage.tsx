import { Alert, Button, Paper, Stack, TextField } from '@mui/material'
import { useState, type FormEvent } from 'react'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/authContext'
import { Page } from '../shared/components/Page'

export function ChangePasswordPage() {
  const { changePassword } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSuccess(false)
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const currentPassword = String(form.get('currentPassword') ?? '')
    const newPassword = String(form.get('newPassword') ?? '')
    const confirmPassword = String(form.get('confirmPassword') ?? '')

    if (newPassword !== confirmPassword) {
      setError('The new passwords do not match.')
      formElement.reset()
      return
    }

    setIsSubmitting(true)
    try {
      await changePassword(currentPassword, newPassword)
      formElement.reset()
      setSuccess(true)
    } catch (caught: unknown) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'Your password could not be changed.',
      )
    } finally {
      formElement.reset()
      setIsSubmitting(false)
    }
  }

  return (
    <Page
      description="Choose a strong password you do not use elsewhere."
      title="Change password"
    >
      <Paper sx={{ maxWidth: 560, p: 3 }}>
        <Stack
          component="form"
          onSubmit={(event) => void handleSubmit(event)}
          spacing={2}
        >
          {error && <Alert severity="error">{error}</Alert>}
          {success && (
            <Alert severity="success">Your password has been changed.</Alert>
          )}
          <TextField
            autoComplete="current-password"
            disabled={isSubmitting}
            label="Current password"
            name="currentPassword"
            required
            type="password"
          />
          <TextField
            autoComplete="new-password"
            disabled={isSubmitting}
            label="New password"
            name="newPassword"
            required
            type="password"
          />
          <TextField
            autoComplete="new-password"
            disabled={isSubmitting}
            label="Confirm new password"
            name="confirmPassword"
            required
            type="password"
          />
          <Button
            disabled={isSubmitting}
            sx={{ alignSelf: 'flex-start' }}
            type="submit"
            variant="contained"
          >
            {isSubmitting ? 'Changing password…' : 'Change password'}
          </Button>
        </Stack>
      </Paper>
    </Page>
  )
}

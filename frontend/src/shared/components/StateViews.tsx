import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material'
import type { ReactNode } from 'react'

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <Box sx={{ py: 6, textAlign: 'center' }} role="status">
      <CircularProgress aria-label={label} size={32} />
      <Typography color="text.secondary" sx={{ mt: 2 }}>
        {label}
      </Typography>
    </Box>
  )
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  return (
    <Alert
      action={
        onRetry ? (
          <Button color="inherit" onClick={onRetry} size="small">
            Try again
          </Button>
        ) : undefined
      }
      severity="error"
    >
      {message}
    </Alert>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <Stack
      spacing={1.5}
      sx={{
        alignItems: 'center',
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        px: 3,
        py: 6,
        textAlign: 'center',
      }}
    >
      <Typography component="h2" variant="h6">
        {title}
      </Typography>
      {description && (
        <Typography color="text.secondary" sx={{ maxWidth: 480 }}>
          {description}
        </Typography>
      )}
      {action}
    </Stack>
  )
}

import { Box, Stack, Typography } from '@mui/material'
import type { PropsWithChildren, ReactNode } from 'react'
import { ContextHelp } from './ContextHelp'
import { ErrorState, LoadingState } from './StateViews'

type PageProps = PropsWithChildren<{
  title: string
  description?: string
  help?: string
  helpLabel?: string
  helpDetails?: string
  actions?: ReactNode
}>

export function Page({
  title,
  description,
  help,
  helpLabel,
  helpDetails,
  actions,
  children,
}: PageProps) {
  return (
    <Stack spacing={3} sx={{ minWidth: 0 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{
          alignItems: { xs: 'flex-start', sm: 'flex-start' },
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'flex-start' }}>
            <Typography component="h1" variant="h4">
              {title}
            </Typography>
            {help && (
              <ContextHelp
                description={help}
                details={helpDetails}
                label={helpLabel ?? title}
              />
            )}
          </Stack>
          {description && (
            <Typography color="text.secondary" sx={{ mt: 0.75, maxWidth: 720 }}>
              {description}
            </Typography>
          )}
        </Box>
        {actions && (
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{ flexShrink: 0, flexWrap: 'wrap' }}
          >
            {actions}
          </Stack>
        )}
      </Stack>
      {children}
    </Stack>
  )
}

export function PageLoading({
  title,
  label,
  help,
}: {
  title: string
  label: string
  help?: string
}) {
  return (
    <Page help={help} title={title}>
      <LoadingState label={label} />
    </Page>
  )
}

export function PageError({
  title,
  message,
  onRetry,
  help,
}: {
  title: string
  message: string
  onRetry?: () => void
  help?: string
}) {
  return (
    <Page help={help} title={title}>
      <ErrorState message={message} onRetry={onRetry} />
    </Page>
  )
}


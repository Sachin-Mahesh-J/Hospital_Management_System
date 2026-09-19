import { Box, Stack, Typography } from '@mui/material'
import type { PropsWithChildren, ReactNode } from 'react'

type PageProps = PropsWithChildren<{
  title: string
  description?: string
  actions?: ReactNode
}>

export function Page({ title, description, actions, children }: PageProps) {
  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Typography component="h1" variant="h4" gutterBottom>
            {title}
          </Typography>
          {description && (
            <Typography color="text.secondary">{description}</Typography>
          )}
        </Box>
        {actions}
      </Stack>
      {children}
    </Stack>
  )
}

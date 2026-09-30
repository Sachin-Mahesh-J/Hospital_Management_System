import { Box, Divider, Stack, Typography } from '@mui/material'
import type { PropsWithChildren, ReactNode } from 'react'
import { ContextHelp } from './ContextHelp'

type FormSectionProps = PropsWithChildren<{
  title: string
  description?: string
  help?: string
  helpDetails?: string
  actions?: ReactNode
}>

export function FormSection({
  title,
  description,
  help,
  helpDetails,
  actions,
  children,
}: FormSectionProps) {
  return (
    <Stack spacing={2}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ alignItems: { sm: 'flex-start' }, justifyContent: 'space-between' }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            <Typography component="h2" variant="h6">
              {title}
            </Typography>
            {help && (
              <ContextHelp
                description={help}
                details={helpDetails}
                label={title}
              />
            )}
          </Stack>
          {description && (
            <Typography color="text.secondary" variant="body2">
              {description}
            </Typography>
          )}
        </Box>
        {actions}
      </Stack>
      <Divider />
      {children}
    </Stack>
  )
}

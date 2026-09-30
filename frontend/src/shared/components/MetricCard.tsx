import { Box, Card, CardContent, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'

type MetricCardProps = {
  label: string
  value: string
  icon?: ReactNode
  detail?: string
  alert?: boolean
}

export function MetricCard({
  label,
  value,
  icon,
  detail,
  alert = false,
}: MetricCardProps) {
  return (
    <Card
      sx={{
        flex: '1 1 220px',
        minWidth: 0,
        borderColor: alert ? 'warning.main' : 'divider',
      }}
    >
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
            {icon}
            <Typography color="text.secondary" variant="body2">
              {label}
            </Typography>
          </Stack>
          <Typography component="p" sx={{ wordBreak: 'break-word' }} variant="h4">
            {value}
          </Typography>
          {detail && (
            <Typography color={alert ? 'warning.dark' : 'text.secondary'} variant="body2">
              {detail}
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}

export function MetricCardSkeleton() {
  return (
    <Card sx={{ flex: '1 1 220px', minWidth: 0 }}>
      <CardContent>
        <Box sx={{ bgcolor: 'action.hover', borderRadius: 1, height: 14, width: '40%' }} />
        <Box sx={{ bgcolor: 'action.hover', borderRadius: 1, height: 32, mt: 2, width: '60%' }} />
      </CardContent>
    </Card>
  )
}

import { Paper, Stack } from '@mui/material'
import type { PropsWithChildren } from 'react'

export function FilterBar({ children }: PropsWithChildren) {
  return (
    <Paper sx={{ p: 2, overflow: 'visible' }}>
      <Stack
        direction="row"
        spacing={2}
        useFlexGap
        sx={{
          alignItems: { xs: 'stretch', sm: 'center' },
          flexWrap: 'wrap',
        }}
      >
        {children}
      </Stack>
    </Paper>
  )
}

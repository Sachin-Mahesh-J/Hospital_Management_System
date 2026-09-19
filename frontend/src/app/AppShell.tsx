import {
  AppBar,
  Box,
  Container,
  Toolbar,
  Typography,
} from '@mui/material'
import type { PropsWithChildren } from 'react'

export function AppShell({ children }: PropsWithChildren) {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography component="div" variant="h6">
            HMS
          </Typography>
        </Toolbar>
      </AppBar>
      <Container component="main" maxWidth="lg" sx={{ py: 5 }}>
        {children}
      </Container>
    </Box>
  )
}

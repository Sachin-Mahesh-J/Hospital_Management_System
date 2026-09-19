import {
  AppBar,
  Box,
  Button,
  Container,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material'
import { Link, Outlet } from 'react-router-dom'

const navigation = [{ label: 'Home', path: '/' }] as const

export function AppShell() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static">
        <Toolbar sx={{ gap: 3 }}>
          <Typography component={Link} to="/" variant="h6" color="inherit" sx={{ textDecoration: 'none' }}>
            HMS
          </Typography>
          <Stack component="nav" direction="row" spacing={1} aria-label="Main navigation">
            {navigation.map((item) => (
              <Button color="inherit" component={Link} key={item.path} to={item.path}>
                {item.label}
              </Button>
            ))}
          </Stack>
        </Toolbar>
      </AppBar>
      <Container component="main" maxWidth="lg" sx={{ py: 5 }}>
        <Outlet />
      </Container>
    </Box>
  )
}

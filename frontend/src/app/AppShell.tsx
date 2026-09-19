import {
  AppBar,
  Box,
  Button,
  Container,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { Can } from '../auth/Can'
import { useAuth } from '../auth/authContext'

const navigation = [
  { label: 'Home', path: '/', permission: null },
  {
    label: 'Patients',
    path: '/patients',
    permission: 'patient.read',
  },
  {
    label: 'Change password',
    path: '/change-password',
    permission: 'identity.password.change',
  },
] as const

export function AppShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
    } catch {
      // AuthProvider still clears local authentication in its finally path.
    } finally {
      navigate('/login', { replace: true })
      setIsLoggingOut(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static">
        <Toolbar sx={{ gap: 3 }}>
          <Typography component={Link} to="/" variant="h6" color="inherit" sx={{ textDecoration: 'none' }}>
            HMS
          </Typography>
          <Stack component="nav" direction="row" spacing={1} aria-label="Main navigation">
            {navigation.map((item) => (
              item.permission
                ? (
                    <Can key={item.path} permission={item.permission}>
                      <Button color="inherit" component={Link} to={item.path}>
                        {item.label}
                      </Button>
                    </Can>
                  )
                : (
                    <Button
                      color="inherit"
                      component={Link}
                      key={item.path}
                      to={item.path}
                    >
                      {item.label}
                    </Button>
                  )
            ))}
          </Stack>
          <Stack
            direction="row"
            spacing={2}
            sx={{ alignItems: 'center', ml: 'auto' }}
          >
            <Typography variant="body2">{user?.username}</Typography>
            <Button
              color="inherit"
              disabled={isLoggingOut}
              onClick={() => void handleLogout()}
            >
              {isLoggingOut ? 'Signing out…' : 'Sign out'}
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>
      <Container component="main" maxWidth="lg" sx={{ py: 5 }}>
        <Outlet />
      </Container>
    </Box>
  )
}

import ChevronLeft from '@mui/icons-material/ChevronLeft'
import ChevronRight from '@mui/icons-material/ChevronRight'
import MenuIcon from '@mui/icons-material/Menu'
import {
  AppBar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useState, type MouseEvent } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/authContext'
import {
  DRAWER_COLLAPSED_WIDTH,
  DRAWER_WIDTH,
  currentNavItem,
  resolvePageTitle,
  visibleNavigation,
  type NavItem,
} from './navigation'

function NavEntry({
  item,
  collapsed,
  selected,
  onNavigate,
}: {
  item: NavItem
  collapsed: boolean
  selected: boolean
  onNavigate: () => void
}) {
  const Icon = item.icon
  const button = (
    <ListItemButton
      aria-label={collapsed ? item.label : undefined}
      component={Link}
      onClick={onNavigate}
      selected={selected}
      to={item.path}
      sx={{
        borderRadius: 1,
        flex: 1,
        justifyContent: collapsed ? 'center' : 'flex-start',
        minWidth: 0,
        px: collapsed ? 1 : 1.5,
      }}
    >
      <ListItemIcon sx={{ minWidth: collapsed ? 0 : 40, color: 'inherit' }}>
        <Icon aria-hidden fontSize="small" />
      </ListItemIcon>
      {!collapsed && (
        <ListItemText
          primary={item.label}
          slotProps={{
            primary: { sx: { overflowWrap: 'anywhere', whiteSpace: 'normal' } },
          }}
        />
      )}
    </ListItemButton>
  )

  if (!collapsed) {
    return (
      <Box sx={{ mb: 0.25, mx: 1, minWidth: 0 }}>
        {button}
      </Box>
    )
  }

  return (
    <Box sx={{ mb: 0.25, mx: 1, minWidth: 0 }}>
      <Tooltip
        describeChild
        placement="right"
        title={
          <Box>
            <Typography variant="subtitle2">{item.label}</Typography>
            <Typography variant="body2">{item.description}</Typography>
          </Box>
        }
      >
        {button}
      </Tooltip>
    </Box>
  )
}

export function AppShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'), {
    defaultMatches: true,
    noSsr: true,
  })
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [accountEl, setAccountEl] = useState<null | HTMLElement>(null)

  const groups = visibleNavigation(user)
  const desktopCollapsed = isDesktop && collapsed
  const drawerWidth = desktopCollapsed ? DRAWER_COLLAPSED_WIDTH : DRAWER_WIDTH
  const pageTitle = resolvePageTitle(location.pathname)
  const activeItem = currentNavItem(location.pathname)
  const roleLabel = user?.roles?.[0] ? user.roles[0].replaceAll('_', ' ') : ''

  const closeMobile = () => setMobileOpen(false)

  const handleLogout = async () => {
    setAccountEl(null)
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

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar sx={{ px: 2, gap: 1, minHeight: 64 }}>
        {!desktopCollapsed && (
          <Typography noWrap sx={{ fontWeight: 700 }} variant="subtitle1">
            HMS
          </Typography>
        )}
        {isDesktop && (
          <Tooltip title={collapsed ? 'Expand navigation' : 'Collapse navigation'}>
            <IconButton
              aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
              onClick={() => setCollapsed((value) => !value)}
              size="small"
              sx={{ ml: desktopCollapsed ? 0 : 'auto' }}
            >
              {collapsed ? <ChevronRight /> : <ChevronLeft />}
            </IconButton>
          </Tooltip>
        )}
      </Toolbar>
      <Divider />
      <Box component="nav" aria-label="Main navigation" sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
        {groups.map((group) => (
          <List
            key={group.id}
            dense
            subheader={
              desktopCollapsed ? undefined : (
                <ListSubheader
                  disableSticky
                  sx={{ bgcolor: 'transparent', lineHeight: 2, fontSize: 12, textTransform: 'uppercase' }}
                >
                  {group.label}
                </ListSubheader>
              )
            }
          >
            {group.items.map((item) => (
              <NavEntry
                collapsed={desktopCollapsed}
                item={item}
                key={item.path}
                onNavigate={closeMobile}
                selected={item.path === activeItem?.path}
              />
            ))}
          </List>
        ))}
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh', bgcolor: 'background.default' }}>
      <AppBar
        color="inherit"
        elevation={0}
        position="fixed"
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar sx={{ gap: 1, minHeight: 64 }}>
          {!isDesktop && (
            <Tooltip title="Open navigation">
              <IconButton
                aria-label="Open navigation"
                edge="start"
                onClick={() => setMobileOpen(true)}
              >
                <MenuIcon />
              </IconButton>
            </Tooltip>
          )}
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography component="h1" noWrap variant="h6">
              {pageTitle}
            </Typography>
          </Box>
          <Button
            aria-controls={accountEl ? 'account-menu' : undefined}
            aria-haspopup="true"
            aria-label="Account menu"
            color="inherit"
            onClick={(event: MouseEvent<HTMLElement>) => setAccountEl(event.currentTarget)}
            sx={{ maxWidth: { xs: 140, sm: 240 }, textTransform: 'none' }}
          >
            <Stack sx={{ alignItems: 'flex-end', minWidth: 0 }}>
              <Typography noWrap variant="body2">
                {user?.username}
              </Typography>
              {roleLabel && (
                <Typography color="text.secondary" noWrap variant="caption">
                  {roleLabel}
                </Typography>
              )}
            </Stack>
          </Button>
          <Button
            color="inherit"
            disabled={isLoggingOut}
            onClick={() => void handleLogout()}
          >
            {isLoggingOut ? 'Signing out…' : 'Sign out'}
          </Button>
        </Toolbar>
      </AppBar>

      <Menu
        anchorEl={accountEl}
        id="account-menu"
        onClose={() => setAccountEl(null)}
        open={Boolean(accountEl)}
      >
        <MenuItem disabled>
          {user?.username}
        </MenuItem>
        <MenuItem
          component={Link}
          onClick={() => setAccountEl(null)}
          to="/change-password"
        >
          Change password
        </MenuItem>
        <MenuItem disabled={isLoggingOut} onClick={() => void handleLogout()}>
          {isLoggingOut ? 'Signing out…' : 'Sign out'}
        </MenuItem>
      </Menu>

      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        {isDesktop ? (
          <Drawer
            open
            variant="permanent"
            sx={{
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: drawerWidth,
                overflowX: 'hidden',
              },
            }}
          >
            {drawer}
          </Drawer>
        ) : (
          <Drawer
            ModalProps={{ keepMounted: true }}
            onClose={closeMobile}
            open={mobileOpen}
            variant="temporary"
            sx={{
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: DRAWER_WIDTH,
              },
            }}
          >
            {drawer}
          </Drawer>
        )}
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          px: { xs: 2, sm: 3, lg: 4 },
          py: 3,
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  )
}

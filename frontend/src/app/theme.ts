import { createTheme } from '@mui/material/styles'

const primary = {
  main: '#075985',
  dark: '#0c4a6e',
  light: '#0284c7',
  contrastText: '#ffffff',
}

export const theme = createTheme({
  palette: {
    primary,
    secondary: {
      main: '#0f766e',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f1f5f9',
      paper: '#ffffff',
    },
    divider: '#e2e8f0',
    text: {
      primary: '#0f172a',
      secondary: '#475569',
    },
    success: { main: '#047857' },
    warning: { main: '#b45309' },
    error: { main: '#b91c1c' },
    info: { main: '#0369a1' },
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", Arial, sans-serif',
    h1: { fontSize: '1.75rem', fontWeight: 600, letterSpacing: '-0.02em' },
    h2: { fontSize: '1.375rem', fontWeight: 600, letterSpacing: '-0.015em' },
    h4: { fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.015em' },
    h5: { fontSize: '1.125rem', fontWeight: 600 },
    h6: { fontSize: '1rem', fontWeight: 600 },
    subtitle1: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: {
    borderRadius: 8,
  },
  shadows: [
    'none',
    '0 1px 2px rgba(15, 23, 42, 0.06)',
    '0 1px 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.04)',
    '0 4px 6px rgba(15, 23, 42, 0.06)',
    '0 6px 12px rgba(15, 23, 42, 0.08)',
    '0 8px 16px rgba(15, 23, 42, 0.08)',
    '0 10px 20px rgba(15, 23, 42, 0.1)',
    '0 12px 24px rgba(15, 23, 42, 0.1)',
    '0 14px 28px rgba(15, 23, 42, 0.1)',
    '0 16px 32px rgba(15, 23, 42, 0.12)',
    '0 18px 36px rgba(15, 23, 42, 0.12)',
    '0 20px 40px rgba(15, 23, 42, 0.12)',
    '0 22px 44px rgba(15, 23, 42, 0.12)',
    '0 24px 48px rgba(15, 23, 42, 0.14)',
    '0 26px 52px rgba(15, 23, 42, 0.14)',
    '0 28px 56px rgba(15, 23, 42, 0.14)',
    '0 30px 60px rgba(15, 23, 42, 0.14)',
    '0 32px 64px rgba(15, 23, 42, 0.16)',
    '0 34px 68px rgba(15, 23, 42, 0.16)',
    '0 36px 72px rgba(15, 23, 42, 0.16)',
    '0 38px 76px rgba(15, 23, 42, 0.16)',
    '0 40px 80px rgba(15, 23, 42, 0.18)',
    '0 42px 84px rgba(15, 23, 42, 0.18)',
    '0 44px 88px rgba(15, 23, 42, 0.18)',
    '0 46px 92px rgba(15, 23, 42, 0.2)',
  ],
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        outlined: {
          borderColor: '#e2e8f0',
        },
      },
    },
    MuiCard: {
      defaultProps: {
        elevation: 0,
        variant: 'outlined',
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          overflowX: 'auto',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          whiteSpace: 'normal',
          overflowWrap: 'anywhere',
          verticalAlign: 'middle',
        },
        head: {
          fontWeight: 600,
          backgroundColor: '#f8fafc',
        },
      },
    },
    MuiDialog: {
      defaultProps: {
        scroll: 'paper',
      },
      styleOverrides: {
        paper: {
          maxHeight: 'calc(100dvh - 32px)',
        },
      },
    },
    MuiSelect: {
      defaultProps: {
        MenuProps: {
          slotProps: {
            paper: {
              sx: {
                maxHeight: 'min(360px, calc(100dvh - 24px))',
              },
            },
          },
        },
      },
      styleOverrides: {
        select: {
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        },
      },
    },
    MuiMenu: {
      defaultProps: {
        slotProps: {
          paper: {
            sx: {
              maxHeight: 'min(360px, calc(100dvh - 24px))',
            },
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          minWidth: 0,
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          whiteSpace: 'normal',
          overflowWrap: 'anywhere',
        },
      },
    },
    MuiTooltip: {
      defaultProps: {
        enterDelay: 300,
        enterNextDelay: 150,
      },
    },
    MuiFormControl: {
      styleOverrides: {
        root: {
          minWidth: 0,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          alignItems: 'center',
        },
      },
    },
  },
})

import InfoOutlined from '@mui/icons-material/InfoOutlined'
import {
  IconButton,
  Popover,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import { useId, useState, type MouseEvent } from 'react'

type ContextHelpProps = {
  label: string
  description: string
  details?: string
  size?: 'small' | 'medium'
}

export function ContextHelp({
  label,
  description,
  details,
  size = 'small',
}: ContextHelpProps) {
  const buttonId = useId()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const open = Boolean(anchor)
  const accessibleLabel = `More information about ${label}`

  const handleOpen = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setAnchor(event.currentTarget)
  }

  return (
    <>
      <Tooltip describeChild title={accessibleLabel}>
        <IconButton
          aria-describedby={open ? `${buttonId}-help` : undefined}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label={accessibleLabel}
          onClick={handleOpen}
          size={size}
          sx={{
            color: 'text.secondary',
            p: 0.5,
            '&:hover, &:focus-visible': {
              color: 'text.primary',
            },
          }}
        >
          <InfoOutlined sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>
      <Popover
        anchorEl={anchor}
        id={`${buttonId}-help`}
        onClose={() => setAnchor(null)}
        open={open}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            role: 'dialog',
            'aria-label': accessibleLabel,
            sx: { maxWidth: 360, p: 2 },
          },
        }}
      >
        <Stack spacing={1}>
          <Typography variant="subtitle2">{label}</Typography>
          <Typography color="text.secondary" variant="body2">
            {description}
          </Typography>
          {details && (
            <Typography variant="body2">{details}</Typography>
          )}
        </Stack>
      </Popover>
    </>
  )
}

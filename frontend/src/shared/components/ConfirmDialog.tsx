import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
} from '@mui/material'
import { useState } from 'react'

type ConfirmDialogProps = {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  confirmColor?: 'primary' | 'error' | 'warning'
  pending?: boolean
  reasonRequired?: boolean
  reasonLabel?: string
  onClose: () => void
  onConfirm: (reason?: string) => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  confirmColor = 'primary',
  pending = false,
  reasonRequired = false,
  reasonLabel = 'Reason',
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  const [reason, setReason] = useState('')
  const canConfirm = !reasonRequired || reason.trim().length > 0

  const handleClose = () => {
    setReason('')
    onClose()
  }

  return (
    <Dialog
      aria-describedby="confirm-dialog-description"
      fullWidth
      maxWidth="sm"
      onClose={handleClose}
      open={open}
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText id="confirm-dialog-description" sx={{ mb: reasonRequired ? 2 : 0 }}>
          {description}
        </DialogContentText>
        {reasonRequired && (
          <TextField
            autoFocus
            fullWidth
            label={reasonLabel}
            onChange={(event) => setReason(event.target.value)}
            required
            value={reason}
          />
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button disabled={pending} onClick={handleClose}>
          Keep current
        </Button>
        <Button
          color={confirmColor}
          disabled={pending || !canConfirm}
          onClick={() => onConfirm(reasonRequired ? reason.trim() : undefined)}
          variant="contained"
        >
          {pending ? 'Working…' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

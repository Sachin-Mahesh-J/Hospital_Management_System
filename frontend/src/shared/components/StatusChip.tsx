import { Chip } from '@mui/material'
import { formatStatusLabel } from './formatStatusLabel'

const toneByStatus: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  active: 'success',
  inactive: 'default',
  deceased: 'error',
  scheduled: 'info',
  checked_in: 'info',
  completed: 'success',
  cancelled: 'default',
  canceled: 'default',
  no_show: 'warning',
  draft: 'default',
  issued: 'info',
  paid: 'success',
  partially_paid: 'warning',
  void: 'error',
  recorded: 'success',
  reversed: 'warning',
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  requested: 'info',
  sample_collected: 'info',
  collected: 'info',
  terminated: 'default',
  in_progress: 'warning',
  reported: 'success',
  finalized: 'success',
  final: 'success',
  dispensed: 'success',
  available: 'success',
  expired: 'error',
  low_stock: 'warning',
  near_expiry: 'warning',
  present: 'success',
  absent: 'warning',
  late: 'warning',
  admitted: 'info',
  discharged: 'success',
  cash: 'default',
  card: 'default',
  bank_transfer: 'default',
}

export function StatusChip({ value }: { value: string }) {
  const tone = toneByStatus[value] ?? 'default'
  return (
    <Chip
      color={tone}
      label={formatStatusLabel(value)}
      size="small"
      variant={tone === 'default' ? 'outlined' : 'filled'}
    />
  )
}

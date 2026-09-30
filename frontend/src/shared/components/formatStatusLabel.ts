const labelOverrides: Record<string, string> = {
  checked_in: 'Checked in',
  no_show: 'No show',
  partially_paid: 'Partially paid',
  in_progress: 'In progress',
  bank_transfer: 'Bank transfer',
  low_stock: 'Low stock',
  near_expiry: 'Near expiry',
  sample_collected: 'Sample collected',
}

export function formatStatusLabel(value: string): string {
  if (labelOverrides[value]) return labelOverrides[value]
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

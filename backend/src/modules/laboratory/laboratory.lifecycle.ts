export const LAB_REQUEST_STATUSES = [
  'requested',
  'sample_collected',
  'in_progress',
  'completed',
  'cancelled',
] as const

export type LabRequestStatus = (typeof LAB_REQUEST_STATUSES)[number]

export function aggregateLabRequestStatus(
  itemStatuses: readonly string[],
): LabRequestStatus {
  if (itemStatuses.length === 0) {
    throw new Error('A laboratory request must have at least one item.')
  }

  const unique = new Set(itemStatuses)
  if (unique.size === 1) {
    const only = itemStatuses[0]
    if (
      only === 'requested' ||
      only === 'sample_collected' ||
      only === 'completed'
    ) {
      return only
    }
  }

  return 'in_progress'
}

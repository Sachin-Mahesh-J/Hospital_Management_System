import { Card, CardContent, Stack, Typography } from '@mui/material'
import { ApiError } from '../../api/client'
import {
  ErrorState,
  LoadingState,
} from '../../shared/components/StateViews'
import { useDashboard } from './hooks'
import type { Dashboard } from './types'

function MetricCard({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <Card sx={{ minWidth: 220, flex: 1 }}>
      <CardContent>
        <Typography color="text.secondary" variant="body2">
          {label}
        </Typography>
        <Typography variant="h5">{value}</Typography>
      </CardContent>
    </Card>
  )
}

function hasAuthorizedMetrics(dashboard: Dashboard): boolean {
  return Boolean(
    dashboard.totalPatients ||
      dashboard.todaysAppointments ||
      dashboard.revenueSummary ||
      dashboard.laboratoryRequests ||
      dashboard.pharmacyAlerts,
  )
}

export function DashboardMetrics({ enabled }: { enabled: boolean }) {
  const query = useDashboard(enabled)

  if (!enabled) return null
  if (query.isLoading) return <LoadingState label="Loading dashboard metrics" />
  if (query.isError) {
    return (
      <ErrorState
        message={query.error instanceof ApiError ? query.error.message : 'Dashboard metrics could not be loaded.'}
        onRetry={() => void query.refetch()}
      />
    )
  }
  if (!query.data || !hasAuthorizedMetrics(query.data)) return null

  const dashboard = query.data
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ flexWrap: 'wrap' }}>
      {dashboard.totalPatients && (
        <MetricCard
          label="Total patients"
          value={String(dashboard.totalPatients.count)}
        />
      )}
      {dashboard.todaysAppointments && (
        <MetricCard
          label="Today's appointments"
          value={String(dashboard.todaysAppointments.count)}
        />
      )}
      {dashboard.revenueSummary && (
        <MetricCard
          label="Revenue summary"
          value={`${dashboard.revenueSummary.totalAmount} ${dashboard.revenueSummary.currency} (${dashboard.revenueSummary.paymentCount})`}
        />
      )}
      {dashboard.laboratoryRequests && (
        <MetricCard
          label="Laboratory requests"
          value={String(dashboard.laboratoryRequests.count)}
        />
      )}
      {dashboard.pharmacyAlerts && (
        <MetricCard
          label="Pharmacy alerts"
          value={`${dashboard.pharmacyAlerts.lowStockMedicineCount} low stock · ${dashboard.pharmacyAlerts.nearExpiryBatchCount} near expiry`}
        />
      )}
    </Stack>
  )
}

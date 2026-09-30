import {
  Alert,
  Stack,
  Typography,
} from '@mui/material'
import BiotechOutlined from '@mui/icons-material/BiotechOutlined'
import EventNoteOutlined from '@mui/icons-material/EventNoteOutlined'
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined'
import PeopleOutlined from '@mui/icons-material/PeopleOutlined'
import PaymentsOutlined from '@mui/icons-material/PaymentsOutlined'
import { ApiError } from '../../api/client'
import { MetricCard, MetricCardSkeleton } from '../../shared/components/MetricCard'
import {
  ErrorState,
} from '../../shared/components/StateViews'
import { useDashboard } from './hooks'
import type { Dashboard } from './types'

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
  if (query.isLoading) {
    return (
      <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap' }}>
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
      </Stack>
    )
  }
  if (query.isError) {
    return (
      <ErrorState
        message={query.error instanceof ApiError ? query.error.message : 'Dashboard metrics could not be loaded.'}
        onRetry={() => void query.refetch()}
      />
    )
  }
  if (!query.data || !hasAuthorizedMetrics(query.data)) {
    return (
      <Alert severity="info">
        No dashboard metrics are available for this account.
      </Alert>
    )
  }

  const dashboard = query.data
  const pharmacyAlerts = dashboard.pharmacyAlerts

  return (
    <Stack spacing={3}>
      <Stack spacing={2}>
        <Typography variant="h6">Overview</Typography>
        <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap' }}>
          {dashboard.totalPatients && (
            <MetricCard
              icon={<PeopleOutlined color="primary" fontSize="small" />}
              label="Total patients"
              value={dashboard.totalPatients.count.toLocaleString()}
            />
          )}
          {dashboard.todaysAppointments && (
            <MetricCard
              icon={<EventNoteOutlined color="primary" fontSize="small" />}
              label="Today's appointments"
              value={dashboard.todaysAppointments.count.toLocaleString()}
            />
          )}
          {dashboard.revenueSummary && (
            <MetricCard
              icon={<PaymentsOutlined color="primary" fontSize="small" />}
              label="Revenue"
              value={`${dashboard.revenueSummary.currency} ${dashboard.revenueSummary.totalAmount}`}
            />
          )}
          {dashboard.laboratoryRequests && (
            <MetricCard
              icon={<BiotechOutlined color="primary" fontSize="small" />}
              label="Laboratory requests"
              value={dashboard.laboratoryRequests.count.toLocaleString()}
            />
          )}
        </Stack>
      </Stack>
      {pharmacyAlerts && (
        <Stack spacing={2}>
          <Typography variant="h6">Pharmacy attention</Typography>
          <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap' }}>
            <MetricCard
              alert={pharmacyAlerts.lowStockMedicineCount > 0}
              icon={<Inventory2Outlined color="warning" fontSize="small" />}
              label="Low stock"
              value={pharmacyAlerts.lowStockMedicineCount.toLocaleString()}
            />
            <MetricCard
              alert={pharmacyAlerts.nearExpiryBatchCount > 0}
              icon={<Inventory2Outlined color="warning" fontSize="small" />}
              label="Near expiry"
              value={pharmacyAlerts.nearExpiryBatchCount.toLocaleString()}
            />
          </Stack>
        </Stack>
      )}
    </Stack>
  )
}

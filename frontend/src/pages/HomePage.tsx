import { Card, CardActionArea, CardContent, Stack, Typography } from '@mui/material'
import { Link } from 'react-router-dom'
import { Can } from '../auth/Can'
import { useAuth } from '../auth/authContext'
import { hasAnyPermission, hasPermission } from '../auth/permission'
import { DashboardMetrics } from '../features/reports/DashboardMetrics'
import { REPORT_PERMISSIONS } from '../features/reports/permissions'
import { Page } from '../shared/components/Page'

const quickActions = [
  {
    permission: 'patient.create',
    to: '/patients/new',
    label: 'Register patient',
    description: 'Create a new patient demographic record.',
  },
  {
    permission: 'appointment.create',
    to: '/appointments/new',
    label: 'New appointment',
    description: 'Book an outpatient appointment.',
  },
  {
    permission: 'lab_request.create',
    to: '/laboratory/new',
    label: 'New lab request',
    description: 'Create a laboratory request.',
  },
  {
    permission: 'stock.receive',
    to: '/pharmacy/inventory/receive',
    label: 'Receive stock',
    description: 'Receive a pharmacy batch into inventory.',
  },
  {
    permission: 'invoice.create',
    to: '/billing/new',
    label: 'Create invoice',
    description: 'Create a billing invoice.',
  },
] as const

export function HomePage() {
  const { user } = useAuth()
  const showDashboard = hasAnyPermission(user, REPORT_PERMISSIONS)

  const availableActions = quickActions.filter((action) =>
    hasPermission(user, action.permission),
  )

  return (
    <Page title="Dashboard">
      <DashboardMetrics enabled={showDashboard} />

      {availableActions.length > 0 && (
        <Stack spacing={1.5}>
          <Typography variant="h6">Quick actions</Typography>
          <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap' }}>
            {availableActions.map((action) => (
              <Can key={action.to} permission={action.permission}>
                <Card sx={{ flex: '1 1 200px', minWidth: 0, maxWidth: 280 }}>
                  <CardActionArea component={Link} to={action.to} sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography variant="subtitle1">{action.label}</Typography>
                      <Typography color="text.secondary" variant="body2">
                        {action.description}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Can>
            ))}
          </Stack>
        </Stack>
      )}
    </Page>
  )
}

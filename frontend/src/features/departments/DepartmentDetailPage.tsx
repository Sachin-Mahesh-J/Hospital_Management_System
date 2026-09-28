import { Button, Paper, Stack, Typography } from '@mui/material'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { Can } from '../../auth/Can'
import { Page } from '../../shared/components/Page'
import { ErrorState, LoadingState } from '../../shared/components/StateViews'
import { useDepartment } from './hooks'

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <Stack spacing={0.5}>
      <Typography color="text.secondary" variant="body2">{label}</Typography>
      <Typography>{value || 'Not recorded'}</Typography>
    </Stack>
  )
}

export function DepartmentDetailPage() {
  const { departmentId = '' } = useParams()
  const query = useDepartment(departmentId)

  if (query.isLoading) return <LoadingState label="Loading department" />
  if (query.isError) {
    return (
      <ErrorState
        message={query.error instanceof ApiError ? query.error.message : 'Department could not be loaded.'}
        onRetry={() => void query.refetch()}
      />
    )
  }
  if (!query.data) return null
  const department = query.data

  return (
    <Page
      title={department.name}
      description={department.code}
      actions={
        <Stack direction="row" spacing={1}>
          <Button component={Link} to="/departments">Back to departments</Button>
          <Can permission="department.update">
            <Button component={Link} to={`/departments/${department.id}/edit`} variant="contained">
              Edit department
            </Button>
          </Can>
        </Stack>
      }
    >
      <Paper sx={{ p: 3 }}>
        <Stack spacing={2.5}>
          <Detail label="Status" value={department.status} />
          <Detail label="Description" value={department.description} />
        </Stack>
      </Paper>
    </Page>
  )
}

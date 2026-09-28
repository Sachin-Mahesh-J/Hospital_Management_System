import { Button, Divider, Paper, Stack, Typography } from '@mui/material'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { Page } from '../../shared/components/Page'
import { ErrorState, LoadingState } from '../../shared/components/StateViews'
import { useLabRequest } from './hooks'
import {
  labEmployeeLabel,
  labPatientLabel,
  labTestLabel,
} from './types'

function Line({ label, value }: { label: string; value: string | null }) {
  return (
    <Stack spacing={0.25}>
      <Typography color="text.secondary" variant="body2">{label}</Typography>
      <Typography>{value || 'Not recorded'}</Typography>
    </Stack>
  )
}

export function LaboratoryReportPage() {
  const { requestId = '' } = useParams()
  const query = useLabRequest(requestId)

  if (query.isLoading) return <LoadingState label="Loading laboratory report" />
  if (query.isError) {
    return (
      <ErrorState
        message={query.error instanceof ApiError ? query.error.message : 'Laboratory report could not be loaded.'}
        onRetry={() => void query.refetch()}
      />
    )
  }
  if (!query.data) return null
  const request = query.data

  return (
    <Page
      title="Laboratory report"
      description="Assembled from stored request, collection, and result data. This is not a stored PDF."
      actions={
        <Stack className="no-print" direction="row" spacing={1}>
          <Button onClick={() => window.print()} variant="contained">
            Print report
          </Button>
          <Button component={Link} to={`/laboratory/${request.id}`}>
            Back to request
          </Button>
        </Stack>
      }
    >
      <style>
        {`
          @media print {
            header, nav, .no-print { display: none !important; }
            main { padding: 0 !important; max-width: none !important; }
          }
        `}
      </style>
      <Paper sx={{ p: 4 }}>
        <Stack spacing={3}>
          <Line label="Patient" value={labPatientLabel(request.patient)} />
          <Line label="Request status" value={request.status} />
          <Line label="Requested" value={new Date(request.requestedAt).toLocaleString()} />
          <Line
            label="Requesting doctor"
            value={`${labEmployeeLabel(request.requestedBy.employee)} (${request.requestedBy.licenseNumber})`}
          />
          {request.clinicalNote && (
            <Line label="Clinical note" value={request.clinicalNote} />
          )}
          <Divider />
          {request.items.map((item) => {
            const latest = item.results[item.results.length - 1]
            return (
              <Stack key={item.id} spacing={1.5}>
                <Typography component="h3" variant="h6">
                  {labTestLabel(item.testDefinition)}
                </Typography>
                <Line label="Item status" value={item.status} />
                <Line
                  label="Collected"
                  value={
                    item.sampleCollectedAt
                      ? `${new Date(item.sampleCollectedAt).toLocaleString()}${
                        item.sampleCollectedBy
                          ? ` by ${labEmployeeLabel(item.sampleCollectedBy)}`
                          : ''
                      }`
                      : null
                  }
                />
                <Line label="Result" value={latest?.resultValue ?? null} />
                <Line label="Unit" value={latest?.resultUnit ?? null} />
                <Line label="Result note" value={latest?.resultNote ?? null} />
                <Line
                  label="Entered"
                  value={
                    latest
                      ? `${new Date(latest.enteredAt).toLocaleString()} by ${labEmployeeLabel(latest.enteredBy)}`
                      : null
                  }
                />
              </Stack>
            )
          })}
        </Stack>
      </Paper>
    </Page>
  )
}

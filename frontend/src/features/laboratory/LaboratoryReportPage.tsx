import { formatHospitalDateTime } from '../../shared/datetime/hospitalTime'
import { Button, Divider, Paper, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { Page, PageError, PageLoading } from '../../shared/components/Page'
import { StatusChip } from '../../shared/components/StatusChip'
import { useLabRequest } from './hooks'
import {
  labEmployeeLabel,
  labPatientLabel,
  labTestLabel,
} from './types'

function Line({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Stack spacing={0.25}>
      <Typography color="text.secondary" variant="body2">{label}</Typography>
      {typeof value === 'string' || value == null ? (
        <Typography>{value || 'Not recorded'}</Typography>
      ) : (
        value
      )}
    </Stack>
  )
}

export function LaboratoryReportPage() {
  const { requestId = '' } = useParams()
  const query = useLabRequest(requestId)

  if (query.isLoading) {
    return <PageLoading title="Laboratory report" label="Loading laboratory report information..." />
  }
  if (query.isError) {
    return (
      <PageError
        title="Laboratory report"
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
          <Line label="Request status" value={<StatusChip value={request.status} />} />
          <Line label="Requested" value={formatHospitalDateTime(request.requestedAt)} />
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
                <Line label="Item status" value={<StatusChip value={item.status} />} />
                <Line
                  label="Collected"
                  value={
                    item.sampleCollectedAt
                      ? `${formatHospitalDateTime(item.sampleCollectedAt)}${
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
                      ? `${formatHospitalDateTime(latest.enteredAt)} by ${labEmployeeLabel(latest.enteredBy)}`
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

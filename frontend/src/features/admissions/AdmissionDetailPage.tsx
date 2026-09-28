import { Button, Paper, Stack, Typography } from '@mui/material'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { Page } from '../../shared/components/Page'
import { ErrorState, LoadingState } from '../../shared/components/StateViews'
import { useAdmission } from './hooks'
import { doctorLabel, patientLabel } from './types'

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <Stack spacing={0.5}>
      <Typography color="text.secondary" variant="body2">{label}</Typography>
      <Typography>{value || 'Not recorded'}</Typography>
    </Stack>
  )
}

export function AdmissionDetailPage() {
  const { admissionId = '' } = useParams()
  return <AdmissionDetail key={admissionId} admissionId={admissionId} />
}

function AdmissionDetail({ admissionId }: { admissionId: string }) {
  const query = useAdmission(admissionId)

  if (query.isLoading) return <LoadingState label="Loading admission" />
  if (query.isError) {
    return (
      <ErrorState
        message={query.error instanceof ApiError ? query.error.message : 'Admission could not be loaded.'}
        onRetry={() => void query.refetch()}
      />
    )
  }
  if (!query.data) return null
  const admission = query.data

  return (
    <Page
      title={admission.admissionNumber}
      description="Admission details. Update, discharge, and cancel are not available to current roles."
      actions={
        <Button component={Link} to="/admissions">Back to admissions</Button>
      }
    >
      <Paper sx={{ p: { xs: 2, md: 3 } }}>
        <Stack spacing={2.5}>
          <Detail label="Admission number" value={admission.admissionNumber} />
          <Detail label="Patient" value={patientLabel(admission.patient)} />
          <Detail label="Attending doctor" value={doctorLabel(admission.attendingDoctor)} />
          <Detail label="Status" value={admission.status} />
          <Detail label="Admitted at" value={new Date(admission.admittedAt).toLocaleString()} />
          <Detail
            label="Discharged at"
            value={admission.dischargedAt ? new Date(admission.dischargedAt).toLocaleString() : null}
          />
          <Detail label="Reason" value={admission.reason} />
          {admission.dischargeSummary ? (
            <Detail label="Discharge summary" value={admission.dischargeSummary} />
          ) : null}
        </Stack>
      </Paper>
    </Page>
  )
}

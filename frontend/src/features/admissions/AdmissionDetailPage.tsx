import { formatHospitalDateTime } from '../../shared/datetime/hospitalTime'
import { Button, Paper, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { Page, PageError, PageLoading } from '../../shared/components/Page'
import { StatusChip } from '../../shared/components/StatusChip'
import { useAdmission } from './hooks'
import { doctorLabel, patientLabel } from './types'

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Stack spacing={0.5}>
      <Typography color="text.secondary" variant="body2">{label}</Typography>
      {typeof value === 'string' || value == null ? (
        <Typography>{value || 'Not recorded'}</Typography>
      ) : (
        value
      )}
    </Stack>
  )
}

export function AdmissionDetailPage() {
  const { admissionId = '' } = useParams()
  return <AdmissionDetail key={admissionId} admissionId={admissionId} />
}

function AdmissionDetail({ admissionId }: { admissionId: string }) {
  const query = useAdmission(admissionId)

  if (query.isLoading) {
    return <PageLoading title="Admission" label="Loading admission information..." />
  }
  if (query.isError) {
    return (
      <PageError
        title="Admission"
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
      actions={
        <Button component={Link} to="/admissions">Back to admissions</Button>
      }
    >
      <Paper sx={{ p: { xs: 2, md: 3 } }}>
        <Stack spacing={2.5}>
          <Detail label="Admission number" value={admission.admissionNumber} />
          <Detail label="Patient" value={patientLabel(admission.patient)} />
          <Detail label="Attending doctor" value={doctorLabel(admission.attendingDoctor)} />
          <Detail label="Status" value={<StatusChip value={admission.status} />} />
          <Detail label="Admitted at" value={formatHospitalDateTime(admission.admittedAt)} />
          <Detail
            label="Discharged at"
            value={admission.dischargedAt ? formatHospitalDateTime(admission.dischargedAt) : null}
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

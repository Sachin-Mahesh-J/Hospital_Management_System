import { Alert, Button, Divider, Paper, Stack, Typography } from '@mui/material'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { Can } from '../../auth/Can'
import { Page } from '../../shared/components/Page'
import { ErrorState, LoadingState } from '../../shared/components/StateViews'
import { PatientDocumentsPanel } from '../documents/PatientDocumentsPanel'
import { useMedicalRecords } from '../medical-records/hooks'
import { usePatient } from './hooks'

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <Stack spacing={0.5}>
      <Typography color="text.secondary" variant="body2">{label}</Typography>
      <Typography>{value || 'Not recorded'}</Typography>
    </Stack>
  )
}

function PatientMedicalHistory({ patientId }: { patientId: string }) {
  const query = useMedicalRecords({ page: 1, pageSize: 10, patientId })
  if (query.isLoading) return <LoadingState label="Loading medical history" />
  if (query.isError) {
    return (
      <ErrorState
        message={query.error instanceof ApiError ? query.error.message : 'Medical history could not be loaded.'}
        onRetry={() => void query.refetch()}
      />
    )
  }
  const records = query.data?.data ?? []
  return (
    <Paper sx={{ p: 3 }}>
      <Typography component="h2" variant="h6" gutterBottom>Medical history</Typography>
      {records.length === 0 ? (
        <Typography color="text.secondary">No medical records for this patient.</Typography>
      ) : (
        <Stack spacing={1}>
          {records.map((record) => (
            <Button
              component={Link}
              key={record.id}
              sx={{ justifyContent: 'flex-start' }}
              to={`/medical-records/${record.id}`}
            >
              {new Date(record.occurredAt).toLocaleString()} — {record.status}
            </Button>
          ))}
        </Stack>
      )}
    </Paper>
  )
}

export function PatientDetailPage() {
  const { patientId = '' } = useParams()
  const query = usePatient(patientId)

  if (query.isLoading) return <LoadingState label="Loading patient" />
  if (query.isError) {
    return (
      <ErrorState
        message={query.error instanceof ApiError ? query.error.message : 'Patient could not be loaded.'}
        onRetry={() => void query.refetch()}
      />
    )
  }
  if (!query.data) return null
  const patient = query.data

  return (
    <Page
      title={`${patient.firstName} ${patient.lastName}`}
      description={patient.patientNumber}
      actions={
        <Stack direction="row" spacing={1}>
          <Button component={Link} to="/patients">Back to patients</Button>
          <Can permission="patient.update">
            <Button component={Link} to={`/patients/${patient.id}/edit`} variant="contained">
              Edit patient
            </Button>
          </Can>
        </Stack>
      }
    >
      <Paper sx={{ p: 3 }}>
        <Stack spacing={2.5}>
          <Typography component="h2" variant="h6">Current information</Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={4}>
            <Detail label="Status" value={patient.status} />
            <Detail label="Date of birth" value={patient.dateOfBirth ? `${patient.dateOfBirth} (${patient.dateOfBirthPrecision})` : 'Unknown'} />
            <Detail label="Sex at registration" value={patient.sexAtRegistration?.replace('_', ' ') ?? null} />
          </Stack>
          <Divider />
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={4}>
            <Detail label="Phone" value={patient.phone} />
            <Detail label="Email" value={patient.email} />
            <Detail label="Address" value={patient.addressText} />
          </Stack>
          <Divider />
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={4}>
            <Detail label="Emergency contact" value={patient.emergencyContactName} />
            <Detail label="Emergency contact phone" value={patient.emergencyContactPhone} />
          </Stack>
        </Stack>
      </Paper>
      <Can
        fallback={
          <Alert severity="info">
            Medical history requires medical-record access. Patient demographic permission is not sufficient.
          </Alert>
        }
        permission="medical_record.read"
      >
        <PatientMedicalHistory patientId={patient.id} />
      </Can>
      <Can
        fallback={
          <Alert severity="info">
            Patient documents require dedicated document permissions.
          </Alert>
        }
        permission="patient_document.read"
      >
        <PatientDocumentsPanel patientId={patient.id} />
      </Can>
    </Page>
  )
}

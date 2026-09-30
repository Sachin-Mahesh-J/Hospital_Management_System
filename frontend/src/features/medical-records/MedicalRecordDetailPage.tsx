import { formatHospitalDateTime } from '../../shared/datetime/hospitalTime'
import {
  Alert,
  Button,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { Can } from '../../auth/Can'
import { useAuth } from '../../auth/authContext'
import { hasPermission } from '../../auth/permission'
import { ConfirmDialog } from '../../shared/components/ConfirmDialog'
import { Page, PageError, PageLoading } from '../../shared/components/Page'
import { formatStatusLabel } from '../../shared/components/formatStatusLabel'
import { StatusChip } from '../../shared/components/StatusChip'
import { useNotification } from '../../shared/notifications/notificationContext'
import { usePrescriptions } from '../prescriptions/hooks'
import { useFinalizeMedicalRecord, useMedicalRecord } from './hooks'
import { authorLabel, patientRecordLabel } from './types'

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

export function MedicalRecordDetailPage() {
  const { medicalRecordId = '' } = useParams()
  return <MedicalRecordDetail key={medicalRecordId} medicalRecordId={medicalRecordId} />
}

function MedicalRecordDetail({ medicalRecordId }: { medicalRecordId: string }) {
  const query = useMedicalRecord(medicalRecordId)
  const finalize = useFinalizeMedicalRecord(medicalRecordId)
  const { user } = useAuth()
  const canReadPrescriptions = hasPermission(user, 'prescription.read')
  const prescriptions = usePrescriptions({
    page: 1,
    pageSize: 20,
    medicalRecordId,
  }, canReadPrescriptions)
  const { notify } = useNotification()
  const [finalizeError, setFinalizeError] = useState<string | null>(null)
  const [confirmFinalize, setConfirmFinalize] = useState(false)

  if (query.isLoading) {
    return <PageLoading title="Medical record" label="Loading medical record information..." />
  }
  if (query.isError) {
    return (
      <PageError
        title="Medical record"
        message={query.error instanceof ApiError ? query.error.message : 'Medical record could not be loaded.'}
        onRetry={() => void query.refetch()}
      />
    )
  }
  if (!query.data) return null
  const record = query.data

  return (
    <Page
      help="Finalizing locks a draft; further changes require an authorized amendment. Final records can receive new prescriptions."
      helpLabel="Finalizing medical records"
      title={patientRecordLabel(record.patient)}
      description={`${formatStatusLabel(record.status)} medical record`}
      actions={
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
          <Button component={Link} to="/medical-records">Back to records</Button>
          <Can permission="medical_record.update">
            {record.status === 'draft' && (
              <Button component={Link} to={`/medical-records/${record.id}/edit`}>
                Edit draft
              </Button>
            )}
          </Can>
          <Can permission="medical_record.amend">
            {record.status === 'final' && (
              <Button component={Link} to={`/medical-records/${record.id}/amend`}>
                Amend
              </Button>
            )}
          </Can>
        </Stack>
      }
    >
      <Paper sx={{ p: 3 }}>
        <Stack spacing={2.5}>
          <Typography component="h2" variant="h6">Record</Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={4}>
            <Detail label="Status" value={<StatusChip value={record.status} />} />
            <Detail label="Occurred" value={formatHospitalDateTime(record.occurredAt)} />
            <Detail
              label="Finalized"
              value={record.finalizedAt ? formatHospitalDateTime(record.finalizedAt) : null}
            />
          </Stack>
          <Divider />
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={4}>
            <Detail label="Patient" value={patientRecordLabel(record.patient)} />
            <Detail label="Author" value={authorLabel(record.author)} />
          </Stack>
          <Detail
            label="Appointment context"
            value={record.appointment
              ? `${record.appointment.status} (${formatHospitalDateTime(record.appointment.startsAt)})`
              : null}
          />
          <Detail
            label="Admission context"
            value={record.admission
              ? `${record.admission.admissionNumber} (${record.admission.status})`
              : null}
          />
        </Stack>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography component="h2" variant="h6" gutterBottom>Diagnoses</Typography>
        {record.diagnoses.length === 0
          ? <Typography color="text.secondary">None recorded.</Typography>
          : record.diagnoses.map((item) => (
              <Typography key={item.id}>{item.diagnosisText}</Typography>
            ))}
      </Paper>
      <Paper sx={{ p: 3 }}>
        <Typography component="h2" variant="h6" gutterBottom>Treatments</Typography>
        {record.treatments.length === 0
          ? <Typography color="text.secondary">None recorded.</Typography>
          : record.treatments.map((item) => (
              <Typography key={item.id}>{item.treatmentText}</Typography>
            ))}
      </Paper>
      <Paper sx={{ p: 3 }}>
        <Typography component="h2" variant="h6" gutterBottom>Medical reports</Typography>
        {record.reports.length === 0
          ? <Typography color="text.secondary">None recorded.</Typography>
          : record.reports.map((item) => (
              <Stack key={item.id} spacing={1}>
                <Typography variant="subtitle1">{item.title}</Typography>
                <Typography>{item.reportText}</Typography>
              </Stack>
            ))}
      </Paper>

      {(record.amends || record.amendedBy) && (
        <Paper sx={{ p: 3 }}>
          <Typography component="h2" variant="h6" gutterBottom>Amendment relationship</Typography>
          {record.amends && (
            <Button component={Link} to={`/medical-records/${record.amends.id}`}>
              View predecessor ({record.amends.status})
            </Button>
          )}
          {record.amendedBy && (
            <Button component={Link} to={`/medical-records/${record.amendedBy.id}`}>
              View successor ({record.amendedBy.status})
            </Button>
          )}
        </Paper>
      )}

      <Can permission="prescription.read">
        <Paper sx={{ p: 3 }}>
          <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}>
            <Typography component="h2" variant="h6">Prescriptions</Typography>
            <Can permission="prescription.create">
              {record.status === 'final' && (
                <Button component={Link} to={`/medical-records/${record.id}/prescriptions/new`}>
                  New prescription
                </Button>
              )}
            </Can>
          </Stack>
          {prescriptions.data?.data.length
            ? prescriptions.data.data.map((prescription) => (
                <Button
                  component={Link}
                  key={prescription.id}
                  sx={{ display: 'block' }}
                  to={`/prescriptions/${prescription.id}`}
                >
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <StatusChip value={prescription.status} />
                    <span>{formatHospitalDateTime(prescription.prescribedAt)}</span>
                  </Stack>
                </Button>
              ))
            : <Typography color="text.secondary">No prescriptions on this record.</Typography>}
        </Paper>
      </Can>

      {finalizeError && <Alert severity="error">{finalizeError}</Alert>}
      <Can permission="medical_record.finalize">
        {record.status === 'draft' && (
          <Button
            disabled={finalize.isPending}
            onClick={() => setConfirmFinalize(true)}
            variant="contained"
          >
            {finalize.isPending ? 'Finalizing…' : 'Finalize record'}
          </Button>
        )}
      </Can>
      <ConfirmDialog
        confirmLabel="Finalize this record"
        description="Finalizing locks this draft. Further changes require an authorized amendment rather than editing the original draft."
        onClose={() => setConfirmFinalize(false)}
        onConfirm={() => {
          setConfirmFinalize(false)
          setFinalizeError(null)
          void finalize.mutateAsync().then(() => {
            notify('Medical record finalized.', 'success')
          }).catch((caught: unknown) => {
            setFinalizeError(
              caught instanceof ApiError
                ? caught.message
                : 'The medical record could not be finalized.',
            )
          })
        }}
        open={confirmFinalize}
        pending={finalize.isPending}
        title="Finalize medical record?"
      />
    </Page>
  )
}

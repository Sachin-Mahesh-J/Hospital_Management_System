import { Alert, Button, Divider, Paper, Stack, Typography } from '@mui/material'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { Can } from '../../auth/Can'
import { DoctorSchedulePanel } from '../doctor-schedules/DoctorSchedulePanel'
import { Page } from '../../shared/components/Page'
import { ErrorState, LoadingState } from '../../shared/components/StateViews'
import { useDoctor } from './hooks'

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <Stack spacing={0.5}>
      <Typography color="text.secondary" variant="body2">{label}</Typography>
      <Typography>{value || 'Not recorded'}</Typography>
    </Stack>
  )
}

export function DoctorDetailPage() {
  const { doctorId = '' } = useParams()
  const query = useDoctor(doctorId)

  if (query.isLoading) return <LoadingState label="Loading doctor" />
  if (query.isError) {
    return (
      <ErrorState
        message={query.error instanceof ApiError ? query.error.message : 'Doctor could not be loaded.'}
        onRetry={() => void query.refetch()}
      />
    )
  }
  if (!query.data) return null
  const doctor = query.data

  return (
    <Page
      title={`${doctor.employee.firstName} ${doctor.employee.lastName}`}
      description={doctor.licenseNumber}
      actions={
        <Stack direction="row" spacing={1}>
          <Button component={Link} to="/doctors">Back to doctors</Button>
          <Can permission="doctor.update">
            <Button component={Link} to={`/doctors/${doctor.id}/edit`} variant="contained">
              Edit doctor
            </Button>
          </Can>
        </Stack>
      }
    >
      <Paper sx={{ p: 3 }}>
        <Stack spacing={2.5}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={4}>
            <Detail label="Doctor status" value={doctor.status} />
            <Detail label="Specialization" value={doctor.specialization} />
            <Detail
              label="Department"
              value={`${doctor.employee.department.name} (${doctor.employee.department.status})`}
            />
          </Stack>
          <Divider />
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={4}>
            <Detail label="Employee number" value={doctor.employee.employeeNumber} />
            <Detail label="Employment status" value={doctor.employee.employmentStatus} />
            <Detail label="Contact extension" value={doctor.contactExtension} />
          </Stack>
          <Divider />
          <Detail label="Professional summary" value={doctor.professionalSummary} />
        </Stack>
      </Paper>
      <Can permission="doctor_schedule.read">
        <DoctorSchedulePanel doctorId={doctor.id} />
      </Can>
      <Can permission="appointment.create">
        <Alert
          action={
            <Button color="inherit" component={Link} size="small" to="/appointments/new">
              Book
            </Button>
          }
          severity="info"
        >
          Book an appointment for this doctor from Appointment Management.
        </Alert>
      </Can>
    </Page>
  )
}

import {
  Alert,
  Button,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useState, type FormEvent } from 'react'
import { ApiError } from '../../api/client'
import { instantToHospitalInput, hospitalDateTimeToOffsetIso } from '../../shared/datetime/hospitalTime'
import { usePatients } from '../patients/hooks'
import type {
  MedicalRecord,
  MedicalRecordAmendment,
  MedicalRecordInput,
  MedicalRecordUpdate,
} from './types'

type Mode = 'create' | 'edit' | 'amend'

type FormResult = MedicalRecordInput | MedicalRecordUpdate | MedicalRecordAmendment

type MedicalRecordFormProps = {
  isPending: boolean
  mode: Mode
  onSubmit: (input: FormResult) => Promise<void>
  record?: MedicalRecord
  submitLabel: string
}

function lines(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

export function MedicalRecordForm({
  isPending,
  mode,
  onSubmit,
  record,
  submitLabel,
}: MedicalRecordFormProps) {
  const patients = usePatients({ page: 1, pageSize: 100 })
  const [error, setError] = useState<string | null>(null)
  const [patientId, setPatientId] = useState(record?.patientId ?? '')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    const form = new FormData(event.currentTarget)
    const occurredLocal = String(form.get('occurredAt') ?? '')
    if (!occurredLocal) {
      setError('Occurred at is required.')
      return
    }
    const selectedPatientId = String(form.get('patientId') ?? patientId).trim()
    if (mode === 'create' && !selectedPatientId) {
      setError('Select a patient.')
      return
    }
    const appointmentId = String(form.get('appointmentId') ?? '').trim() || null
    const admissionId = String(form.get('admissionId') ?? '').trim() || null
    if (appointmentId && admissionId) {
      setError('A medical record may have an appointment or an admission, not both.')
      return
    }
    const diagnoses = lines(String(form.get('diagnoses') ?? '')).map((diagnosisText) => ({
      diagnosisText,
    }))
    const treatments = lines(String(form.get('treatments') ?? '')).map((treatmentText) => ({
      treatmentText,
    }))
    const reportTitle = String(form.get('reportTitle') ?? '').trim()
    const reportText = String(form.get('reportText') ?? '').trim()
    const reports = reportTitle || reportText
      ? [{ title: reportTitle, reportText }]
      : []
    if ((reportTitle && !reportText) || (!reportTitle && reportText)) {
      setError('A medical report needs both a title and report text.')
      return
    }
    if (mode === 'amend') {
      const reason = String(form.get('reason') ?? '').trim()
      if (!reason) {
        setError('An amendment reason is required.')
        return
      }
      if (diagnoses.length + treatments.length + reports.length === 0) {
        setError('The successor must include a diagnosis, treatment, or report.')
        return
      }
      try {
        await onSubmit({
          occurredAt: hospitalDateTimeToOffsetIso(occurredLocal),
          appointmentId,
          admissionId,
          diagnoses,
          treatments,
          reports,
          reason,
        })
      } catch (caught) {
        setError(
          caught instanceof ApiError
            ? caught.message
            : 'The medical record could not be saved.',
        )
      }
      return
    }

    try {
      await onSubmit({
        ...(mode === 'create' ? { patientId: selectedPatientId } : {}),
        occurredAt: hospitalDateTimeToOffsetIso(occurredLocal),
        appointmentId,
        admissionId,
        diagnoses,
        treatments,
        reports,
      })
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'The medical record could not be saved.',
      )
    }
  }

  const occurredDefault = instantToHospitalInput(
    record?.occurredAt ?? new Date().toISOString(),
  )

  return (
    <Paper sx={{ p: 3 }}>
      <Stack component="form" spacing={2.5} onSubmit={(event) => void handleSubmit(event)}>
        {error && <Alert severity="error">{error}</Alert>}
        {mode === 'create' ? (
          <TextField
            label="Patient"
            name="patientId"
            onChange={(event) => setPatientId(event.target.value)}
            required
            select
            value={patientId}
          >
            <MenuItem value="">Select a patient</MenuItem>
            {(patients.data?.data ?? []).map((patient) => (
              <MenuItem key={patient.id} value={patient.id}>
                {patient.firstName} {patient.lastName} ({patient.patientNumber})
              </MenuItem>
            ))}
          </TextField>
        ) : (
          <TextField
            disabled
            label="Patient"
            value={`${record?.patient.firstName ?? ''} ${record?.patient.lastName ?? ''}`}
          />
        )}
        <TextField
          defaultValue={occurredDefault}
          label="Occurred at"
          name="occurredAt"
          required
          slotProps={{ inputLabel: { shrink: true } }}
          type="datetime-local"
        />
        <TextField
          defaultValue={record?.appointmentId ?? ''}
          helperText="Optional. Leave blank if this record is not linked to an appointment."
          label="Appointment ID"
          name="appointmentId"
        />
        <TextField
          defaultValue={record?.admissionId ?? ''}
          helperText="Optional. Leave blank if this record is not linked to an admission."
          label="Admission ID"
          name="admissionId"
        />
        <TextField
          defaultValue={(record?.diagnoses ?? []).map((item) => item.diagnosisText).join('\n')}
          helperText="One diagnosis per line."
          label="Diagnoses"
          minRows={3}
          multiline
          name="diagnoses"
        />
        <TextField
          defaultValue={(record?.treatments ?? []).map((item) => item.treatmentText).join('\n')}
          helperText="One treatment per line."
          label="Treatments"
          minRows={3}
          multiline
          name="treatments"
        />
        <Typography variant="subtitle2">Optional medical report</Typography>
        <TextField
          defaultValue={record?.reports[0]?.title ?? ''}
          label="Report title"
          name="reportTitle"
        />
        <TextField
          defaultValue={record?.reports[0]?.reportText ?? ''}
          label="Report text"
          minRows={4}
          multiline
          name="reportText"
        />
        {mode === 'amend' && (
          <TextField
            label="Amendment reason"
            name="reason"
            required
            slotProps={{ htmlInput: { maxLength: 500 } }}
          />
        )}
        <Button disabled={isPending} type="submit" variant="contained">
          {isPending ? 'Saving…' : submitLabel}
        </Button>
      </Stack>
    </Paper>
  )
}

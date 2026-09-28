import type {
  Admission,
  Appointment,
  Diagnosis,
  Employee,
  MedicalRecord,
  MedicalReport,
  Patient,
  Treatment,
} from '@prisma/client'

export type MedicalRecordRecord = MedicalRecord & {
  patient: Patient
  author: Employee
  appointment: Appointment | null
  admission: Admission | null
  diagnoses: Diagnosis[]
  treatments: Treatment[]
  reports: MedicalReport[]
  amends: { id: string; status: string; occurredAt: Date } | null
  amendedBy: { id: string; status: string; occurredAt: Date } | null
}

type PatientSummary = {
  id: string
  patientNumber: string
  firstName: string
  lastName: string
  status: string
}

type AuthorSummary = {
  id: string
  employeeNumber: string
  firstName: string
  lastName: string
  employmentStatus: string
}

type RelatedRecord = {
  id: string
  status: string
  occurredAt: string
}

export type MedicalRecordListDto = {
  id: string
  patientId: string
  authorEmployeeId: string
  appointmentId: string | null
  admissionId: string | null
  occurredAt: string
  status: string
  finalizedAt: string | null
  amendsMedicalRecordId: string | null
  createdAt: string
  updatedAt: string
  patient: PatientSummary
  author: AuthorSummary
}

export type MedicalRecordDetailDto = MedicalRecordListDto & {
  diagnoses: Array<{ id: string; diagnosisText: string; createdAt: string }>
  treatments: Array<{ id: string; treatmentText: string; createdAt: string }>
  reports: Array<{
    id: string
    title: string
    reportText: string
    createdAt: string
  }>
  appointment: {
    id: string
    status: string
    startsAt: string
    endsAt: string
  } | null
  admission: {
    id: string
    admissionNumber: string
    status: string
    admittedAt: string
  } | null
  amends: RelatedRecord | null
  amendedBy: RelatedRecord | null
}

function patientSummary(patient: Patient): PatientSummary {
  return {
    id: patient.id,
    patientNumber: patient.patientNumber,
    firstName: patient.firstName,
    lastName: patient.lastName,
    status: patient.status,
  }
}

function authorSummary(author: Employee): AuthorSummary {
  return {
    id: author.id,
    employeeNumber: author.employeeNumber,
    firstName: author.firstName,
    lastName: author.lastName,
    employmentStatus: author.employmentStatus,
  }
}

function relatedRecord(row: {
  id: string
  status: string
  occurredAt: Date
}): RelatedRecord {
  return {
    id: row.id,
    status: row.status,
    occurredAt: row.occurredAt.toISOString(),
  }
}

function commonFields(record: MedicalRecordRecord): MedicalRecordListDto {
  return {
    id: record.id,
    patientId: record.patientId,
    authorEmployeeId: record.authorEmployeeId,
    appointmentId: record.appointmentId,
    admissionId: record.admissionId,
    occurredAt: record.occurredAt.toISOString(),
    status: record.status,
    finalizedAt: record.finalizedAt?.toISOString() ?? null,
    amendsMedicalRecordId: record.amendsMedicalRecordId,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    patient: patientSummary(record.patient),
    author: authorSummary(record.author),
  }
}

export function toMedicalRecordListDto(
  record: MedicalRecordRecord,
): MedicalRecordListDto {
  return commonFields(record)
}

export function toMedicalRecordDetailDto(
  record: MedicalRecordRecord,
): MedicalRecordDetailDto {
  return {
    ...commonFields(record),
    diagnoses: record.diagnoses.map((item) => ({
      id: item.id,
      diagnosisText: item.diagnosisText,
      createdAt: item.createdAt.toISOString(),
    })),
    treatments: record.treatments.map((item) => ({
      id: item.id,
      treatmentText: item.treatmentText,
      createdAt: item.createdAt.toISOString(),
    })),
    reports: record.reports.map((item) => ({
      id: item.id,
      title: item.title,
      reportText: item.reportText,
      createdAt: item.createdAt.toISOString(),
    })),
    appointment: record.appointment
      ? {
          id: record.appointment.id,
          status: record.appointment.status,
          startsAt: record.appointment.startsAt.toISOString(),
          endsAt: record.appointment.endsAt.toISOString(),
        }
      : null,
    admission: record.admission
      ? {
          id: record.admission.id,
          admissionNumber: record.admission.admissionNumber,
          status: record.admission.status,
          admittedAt: record.admission.admittedAt.toISOString(),
        }
      : null,
    amends: record.amends ? relatedRecord(record.amends) : null,
    amendedBy: record.amendedBy ? relatedRecord(record.amendedBy) : null,
  }
}

export const medicalRecordStatuses = ['draft', 'final', 'amended'] as const
export type MedicalRecordStatus = (typeof medicalRecordStatuses)[number]

export type MedicalRecordPatient = {
  id: string
  patientNumber: string
  firstName: string
  lastName: string
  status: string
}

export type MedicalRecordAuthor = {
  id: string
  employeeNumber: string
  firstName: string
  lastName: string
  employmentStatus: string
}

export type MedicalRecordRelation = {
  id: string
  status: MedicalRecordStatus
  occurredAt: string
}

export type Diagnosis = {
  id: string
  diagnosisText: string
  createdAt: string
}

export type Treatment = {
  id: string
  treatmentText: string
  createdAt: string
}

export type ClinicalReport = {
  id: string
  title: string
  reportText: string
  createdAt: string
}

export type MedicalRecordListItem = {
  id: string
  patientId: string
  authorEmployeeId: string
  appointmentId: string | null
  admissionId: string | null
  occurredAt: string
  status: MedicalRecordStatus
  finalizedAt: string | null
  amendsMedicalRecordId: string | null
  createdAt: string
  updatedAt: string
  patient: MedicalRecordPatient
  author: MedicalRecordAuthor
}

export type MedicalRecord = MedicalRecordListItem & {
  diagnoses: Diagnosis[]
  treatments: Treatment[]
  reports: ClinicalReport[]
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
  amends: MedicalRecordRelation | null
  amendedBy: MedicalRecordRelation | null
}

export type DiagnosisInput = { diagnosisText: string }
export type TreatmentInput = { treatmentText: string }
export type ReportInput = { title: string; reportText: string }

export type MedicalRecordInput = {
  patientId: string
  occurredAt: string
  appointmentId?: string | null
  admissionId?: string | null
  diagnoses?: DiagnosisInput[]
  treatments?: TreatmentInput[]
  reports?: ReportInput[]
}

export type MedicalRecordUpdate = {
  occurredAt?: string
  appointmentId?: string | null
  admissionId?: string | null
  diagnoses?: DiagnosisInput[]
  treatments?: TreatmentInput[]
  reports?: ReportInput[]
}

export type MedicalRecordAmendment = {
  occurredAt: string
  appointmentId?: string | null
  admissionId?: string | null
  diagnoses?: DiagnosisInput[]
  treatments?: TreatmentInput[]
  reports?: ReportInput[]
  reason: string
}

export type MedicalRecordFilters = {
  page: number
  pageSize: number
  patientId?: string
  authorEmployeeId?: string
  status?: MedicalRecordStatus
  occurredAtFrom?: string
  occurredAtTo?: string
  sortBy?: 'occurredAt' | 'createdAt' | 'status'
  sortOrder?: 'asc' | 'desc'
}

export type MedicalRecordListResult = {
  data: MedicalRecordListItem[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}

export function patientRecordLabel(patient: MedicalRecordPatient): string {
  return `${patient.firstName} ${patient.lastName} (${patient.patientNumber})`
}

export function authorLabel(author: MedicalRecordAuthor): string {
  return `${author.firstName} ${author.lastName}`
}

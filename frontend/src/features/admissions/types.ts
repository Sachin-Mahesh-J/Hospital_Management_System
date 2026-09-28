export const admissionStatuses = ['admitted', 'discharged', 'cancelled'] as const

export type AdmissionStatus = (typeof admissionStatuses)[number]

export type AdmissionPatient = {
  id: string
  patientNumber: string
  firstName: string
  lastName: string
  status: string
}

export type AdmissionDoctor = {
  id: string
  licenseNumber: string
  specialization: string
  status: string
  employee: {
    id: string
    employeeNumber: string
    firstName: string
    lastName: string
    employmentStatus: string
  }
}

export type Admission = {
  id: string
  admissionNumber: string
  patientId: string
  attendingDoctorId: string | null
  admittedAt: string
  dischargedAt: string | null
  status: AdmissionStatus
  reason: string
  dischargeSummary: string | null
  createdByUserId: string
  createdAt: string
  updatedAt: string
  patient: AdmissionPatient
  attendingDoctor: AdmissionDoctor | null
  createdBy: { id: string; username: string }
}

export type AdmissionInput = {
  patientId: string
  attendingDoctorId?: string | null
  reason: string
}

export type AdmissionFilters = {
  page: number
  pageSize: number
  patientId?: string
  attendingDoctorId?: string
  status?: AdmissionStatus
  sortBy?: 'admittedAt' | 'admissionNumber' | 'status' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

export type AdmissionListResult = {
  data: Admission[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}

export function patientLabel(patient: AdmissionPatient): string {
  return `${patient.firstName} ${patient.lastName} (${patient.patientNumber})`
}

export function doctorLabel(doctor: AdmissionDoctor | null): string {
  if (!doctor) return 'Not assigned'
  return `${doctor.employee.firstName} ${doctor.employee.lastName}`
}

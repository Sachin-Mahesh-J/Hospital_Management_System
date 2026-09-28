import type { Admission, DoctorProfile, Employee, Patient } from '@prisma/client'

export type AdmissionRecord = Admission & {
  patient: Patient
  attendingDoctor: (DoctorProfile & { employee: Employee }) | null
  createdBy: { id: string; username: string }
}

export type AdmissionDto = {
  id: string
  admissionNumber: string
  patientId: string
  attendingDoctorId: string | null
  admittedAt: string
  dischargedAt: string | null
  status: string
  reason: string
  dischargeSummary: string | null
  createdByUserId: string
  createdAt: string
  updatedAt: string
  patient: {
    id: string
    patientNumber: string
    firstName: string
    lastName: string
    status: string
  }
  attendingDoctor: {
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
  } | null
  createdBy: { id: string; username: string }
}

export function toAdmissionDto(admission: AdmissionRecord): AdmissionDto {
  return {
    id: admission.id,
    admissionNumber: admission.admissionNumber,
    patientId: admission.patientId,
    attendingDoctorId: admission.attendingDoctorId,
    admittedAt: admission.admittedAt.toISOString(),
    dischargedAt: admission.dischargedAt?.toISOString() ?? null,
    status: admission.status,
    reason: admission.reason,
    dischargeSummary: admission.dischargeSummary,
    createdByUserId: admission.createdByUserId,
    createdAt: admission.createdAt.toISOString(),
    updatedAt: admission.updatedAt.toISOString(),
    patient: {
      id: admission.patient.id,
      patientNumber: admission.patient.patientNumber,
      firstName: admission.patient.firstName,
      lastName: admission.patient.lastName,
      status: admission.patient.status,
    },
    attendingDoctor: admission.attendingDoctor
      ? {
          id: admission.attendingDoctor.id,
          licenseNumber: admission.attendingDoctor.licenseNumber,
          specialization: admission.attendingDoctor.specialization,
          status: admission.attendingDoctor.status,
          employee: {
            id: admission.attendingDoctor.employee.id,
            employeeNumber: admission.attendingDoctor.employee.employeeNumber,
            firstName: admission.attendingDoctor.employee.firstName,
            lastName: admission.attendingDoctor.employee.lastName,
            employmentStatus: admission.attendingDoctor.employee.employmentStatus,
          },
        }
      : null,
    createdBy: admission.createdBy,
  }
}

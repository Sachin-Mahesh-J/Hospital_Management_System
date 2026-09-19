import type { Patient } from '@prisma/client'

export type PatientDto = {
  id: string
  patientNumber: string
  firstName: string
  lastName: string
  dateOfBirth: string | null
  dateOfBirthPrecision: string
  sexAtRegistration: string | null
  phone: string | null
  email: string | null
  addressText: string | null
  emergencyContactName: string | null
  emergencyContactPhone: string | null
  status: string
  createdAt: string
  updatedAt: string
}

export function toPatientDto(patient: Patient): PatientDto {
  return {
    id: patient.id,
    patientNumber: patient.patientNumber,
    firstName: patient.firstName,
    lastName: patient.lastName,
    dateOfBirth: patient.dateOfBirth
      ? patient.dateOfBirth.toISOString().slice(0, 10)
      : null,
    dateOfBirthPrecision: patient.dateOfBirthPrecision,
    sexAtRegistration: patient.sexAtRegistration,
    phone: patient.phone,
    email: patient.email,
    addressText: patient.addressText,
    emergencyContactName: patient.emergencyContactName,
    emergencyContactPhone: patient.emergencyContactPhone,
    status: patient.status,
    createdAt: patient.createdAt.toISOString(),
    updatedAt: patient.updatedAt.toISOString(),
  }
}

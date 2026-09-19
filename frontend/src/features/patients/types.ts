export const patientStatuses = ['active', 'inactive', 'deceased'] as const
export const patientSexValues = [
  'female',
  'male',
  'intersex',
  'unknown',
  'not_disclosed',
] as const
export const dobPrecisions = ['exact', 'month', 'year', 'unknown'] as const

export type PatientStatus = (typeof patientStatuses)[number]
export type PatientSex = (typeof patientSexValues)[number]
export type DobPrecision = (typeof dobPrecisions)[number]

export type Patient = {
  id: string
  patientNumber: string
  firstName: string
  lastName: string
  dateOfBirth: string | null
  dateOfBirthPrecision: DobPrecision
  sexAtRegistration: PatientSex | null
  phone: string | null
  email: string | null
  addressText: string | null
  emergencyContactName: string | null
  emergencyContactPhone: string | null
  status: PatientStatus
  createdAt: string
  updatedAt: string
}

export type PatientInput = {
  firstName: string
  lastName: string
  dateOfBirth: string | null
  dateOfBirthPrecision: DobPrecision
  sexAtRegistration?: PatientSex | null
  phone?: string | null
  email?: string | null
  addressText?: string | null
  emergencyContactName?: string | null
  emergencyContactPhone?: string | null
}

export type PatientUpdate = Partial<PatientInput> & {
  status?: PatientStatus
}

export type PatientFilters = {
  page: number
  pageSize: number
  search?: string
  status?: PatientStatus
  sortBy?: 'patientNumber' | 'firstName' | 'lastName' | 'dateOfBirth' | 'status' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

export type PatientListResult = {
  data: Patient[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}

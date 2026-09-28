export const labRequestStatuses = [
  'requested',
  'sample_collected',
  'in_progress',
  'completed',
  'cancelled',
] as const
export type LabRequestStatus = (typeof labRequestStatuses)[number]

export type LabPatient = {
  id: string
  patientNumber: string
  firstName: string
  lastName: string
  status: string
}

export type LabEmployee = {
  id: string
  employeeNumber: string
  firstName: string
  lastName: string
  employmentStatus: string
}

export type LabDoctor = {
  id: string
  licenseNumber: string
  specialization: string
  status: string
  employee: LabEmployee
}

export type LabTestCatalogItem = {
  id: string
  code: string
  name: string
  status: string
}

export type LabResult = {
  id: string
  versionNumber: number
  resultValue: string
  resultUnit: string | null
  referenceRangeSnapshot: string | null
  resultNote: string | null
  enteredAt: string
  enteredByEmployeeId: string
  enteredBy: LabEmployee
}

export type LabRequestItem = {
  id: string
  testDefinitionId: string
  status: LabRequestStatus
  sampleCollectedAt: string | null
  sampleCollectedByEmployeeId: string | null
  createdAt: string
  updatedAt: string
  testDefinition: LabTestCatalogItem
  sampleCollectedBy: LabEmployee | null
  results: LabResult[]
}

export type LabRequestListItem = {
  id: string
  patientId: string
  requestedByDoctorId: string
  medicalRecordId: string | null
  requestedAt: string
  status: LabRequestStatus
  clinicalNote: string | null
  createdAt: string
  updatedAt: string
  patient: LabPatient
  requestedBy: LabDoctor
  itemCount: number
}

export type LabRequest = LabRequestListItem & {
  items: LabRequestItem[]
}

export type LabRequestItemInput = {
  testDefinitionId: string
}

export type LabRequestInput = {
  patientId: string
  medicalRecordId?: string | null
  clinicalNote?: string | null
  items: LabRequestItemInput[]
}

export type LabResultInput = {
  resultValue: string
  resultUnit?: string | null
  referenceRangeSnapshot?: string | null
  resultNote?: string | null
}

export type LabRequestFilters = {
  page: number
  pageSize: number
  patientId?: string
  requestedByDoctorId?: string
  status?: LabRequestStatus
  requestedAtFrom?: string
  requestedAtTo?: string
  sortBy?: 'requestedAt' | 'createdAt' | 'status'
  sortOrder?: 'asc' | 'desc'
}

export type LabTestFilters = {
  page: number
  pageSize: number
  search?: string
}

export type Pagination = {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export type LabRequestListResult = {
  data: LabRequestListItem[]
  pagination: Pagination
}

export type LabTestListResult = {
  data: LabTestCatalogItem[]
  pagination: Pagination
}

export function canCollectSample(status: LabRequestStatus): boolean {
  return status === 'requested'
}

export function canEnterResult(status: LabRequestStatus): boolean {
  return status === 'sample_collected'
}

export function labTestLabel(test: LabTestCatalogItem): string {
  return `${test.name} — ${test.code}`
}

export function labPatientLabel(patient: LabPatient): string {
  return `${patient.firstName} ${patient.lastName} (${patient.patientNumber})`
}

export function labEmployeeLabel(employee: LabEmployee): string {
  return `${employee.firstName} ${employee.lastName}`
}

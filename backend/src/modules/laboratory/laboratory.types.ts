import type {
  DoctorProfile,
  Employee,
  LabRequest,
  LabRequestItem,
  LabResult,
  LabTestDefinition,
  MedicalRecord,
  Patient,
} from '@prisma/client'

export type LabRequestRecord = LabRequest & {
  patient: Patient
  requestedBy: DoctorProfile & { employee: Employee }
  medicalRecord: Pick<MedicalRecord, 'id' | 'status' | 'patientId'> | null
  items: Array<
    LabRequestItem & {
      testDefinition: LabTestDefinition
      sampleCollectedBy: Employee | null
      results: Array<LabResult & { enteredBy: Employee }>
    }
  >
}

type PatientSummary = {
  id: string
  patientNumber: string
  firstName: string
  lastName: string
  status: string
}

type EmployeeSummary = {
  id: string
  employeeNumber: string
  firstName: string
  lastName: string
  employmentStatus: string
}

type DoctorSummary = {
  id: string
  licenseNumber: string
  specialization: string
  status: string
  employee: EmployeeSummary
}

export type LabTestCatalogDto = {
  id: string
  code: string
  name: string
  status: string
}

export type LabResultDto = {
  id: string
  versionNumber: number
  resultValue: string
  resultUnit: string | null
  referenceRangeSnapshot: string | null
  resultNote: string | null
  enteredAt: string
  enteredByEmployeeId: string
  enteredBy: EmployeeSummary
}

export type LabRequestItemDto = {
  id: string
  testDefinitionId: string
  status: string
  sampleCollectedAt: string | null
  sampleCollectedByEmployeeId: string | null
  createdAt: string
  updatedAt: string
  testDefinition: LabTestCatalogDto
  sampleCollectedBy: EmployeeSummary | null
  results: LabResultDto[]
}

export type LabRequestListDto = {
  id: string
  patientId: string
  requestedByDoctorId: string
  medicalRecordId: string | null
  requestedAt: string
  status: string
  clinicalNote: string | null
  createdAt: string
  updatedAt: string
  patient: PatientSummary
  requestedBy: DoctorSummary
  itemCount: number
}

export type LabRequestDetailDto = LabRequestListDto & {
  items: LabRequestItemDto[]
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

function employeeSummary(employee: Employee): EmployeeSummary {
  return {
    id: employee.id,
    employeeNumber: employee.employeeNumber,
    firstName: employee.firstName,
    lastName: employee.lastName,
    employmentStatus: employee.employmentStatus,
  }
}

function doctorSummary(
  requestedBy: DoctorProfile & { employee: Employee },
): DoctorSummary {
  return {
    id: requestedBy.id,
    licenseNumber: requestedBy.licenseNumber,
    specialization: requestedBy.specialization,
    status: requestedBy.status,
    employee: employeeSummary(requestedBy.employee),
  }
}

function testCatalogDto(test: LabTestDefinition): LabTestCatalogDto {
  return {
    id: test.id,
    code: test.code,
    name: test.name,
    status: test.status,
  }
}

function resultDto(result: LabResult & { enteredBy: Employee }): LabResultDto {
  return {
    id: result.id,
    versionNumber: result.versionNumber,
    resultValue: result.resultValue,
    resultUnit: result.resultUnit,
    referenceRangeSnapshot: result.referenceRangeSnapshot,
    resultNote: result.resultNote,
    enteredAt: result.enteredAt.toISOString(),
    enteredByEmployeeId: result.enteredByEmployeeId,
    enteredBy: employeeSummary(result.enteredBy),
  }
}

function commonFields(request: LabRequestRecord): LabRequestListDto {
  return {
    id: request.id,
    patientId: request.patientId,
    requestedByDoctorId: request.requestedByDoctorId,
    medicalRecordId: request.medicalRecordId,
    requestedAt: request.requestedAt.toISOString(),
    status: request.status,
    clinicalNote: request.clinicalNote,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
    patient: patientSummary(request.patient),
    requestedBy: doctorSummary(request.requestedBy),
    itemCount: request.items.length,
  }
}

export function toLabTestCatalogDto(
  test: LabTestDefinition,
): LabTestCatalogDto {
  return testCatalogDto(test)
}

export function toLabRequestListDto(
  request: LabRequestRecord,
): LabRequestListDto {
  return commonFields(request)
}

export function toLabRequestDetailDto(
  request: LabRequestRecord,
): LabRequestDetailDto {
  return {
    ...commonFields(request),
    items: request.items.map((item) => ({
      id: item.id,
      testDefinitionId: item.testDefinitionId,
      status: item.status,
      sampleCollectedAt: item.sampleCollectedAt?.toISOString() ?? null,
      sampleCollectedByEmployeeId: item.sampleCollectedByEmployeeId,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      testDefinition: testCatalogDto(item.testDefinition),
      sampleCollectedBy: item.sampleCollectedBy
        ? employeeSummary(item.sampleCollectedBy)
        : null,
      results: item.results.map(resultDto),
    })),
  }
}

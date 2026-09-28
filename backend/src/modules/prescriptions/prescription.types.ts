import type {
  DoctorProfile,
  Employee,
  MedicalRecord,
  Medicine,
  Patient,
  Prescription,
  PrescriptionItem,
} from '@prisma/client'

export type PrescriptionRecord = Prescription & {
  patient: Patient
  medicalRecord: Pick<MedicalRecord, 'id' | 'status' | 'patientId'>
  prescribedBy: DoctorProfile & { employee: Employee }
  items: Array<PrescriptionItem & { medicine: Medicine }>
}

type PatientSummary = {
  id: string
  patientNumber: string
  firstName: string
  lastName: string
  status: string
}

type PrescriberSummary = {
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

export type PrescriptionItemDto = {
  id: string
  medicineId: string
  dosage: string
  route: string | null
  frequency: string
  duration: string
  instructions: string | null
  quantityPrescribed: string
  unit: string
  createdAt: string
  updatedAt: string
  medicine: {
    id: string
    code: string
    genericName: string
    brandName: string | null
    dosageForm: string
    strength: string | null
    inventoryUnit: string
    status: string
  }
}

export type PrescriptionListDto = {
  id: string
  medicalRecordId: string
  patientId: string
  prescribedByDoctorId: string
  prescribedAt: string
  status: string
  notes: string | null
  createdAt: string
  updatedAt: string
  patient: PatientSummary
  prescribedBy: PrescriberSummary
  itemCount: number
}

export type PrescriptionDetailDto = PrescriptionListDto & {
  items: PrescriptionItemDto[]
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

function prescriberSummary(
  prescribedBy: DoctorProfile & { employee: Employee },
): PrescriberSummary {
  return {
    id: prescribedBy.id,
    licenseNumber: prescribedBy.licenseNumber,
    specialization: prescribedBy.specialization,
    status: prescribedBy.status,
    employee: {
      id: prescribedBy.employee.id,
      employeeNumber: prescribedBy.employee.employeeNumber,
      firstName: prescribedBy.employee.firstName,
      lastName: prescribedBy.employee.lastName,
      employmentStatus: prescribedBy.employee.employmentStatus,
    },
  }
}

function commonFields(prescription: PrescriptionRecord): PrescriptionListDto {
  return {
    id: prescription.id,
    medicalRecordId: prescription.medicalRecordId,
    patientId: prescription.patientId,
    prescribedByDoctorId: prescription.prescribedByDoctorId,
    prescribedAt: prescription.prescribedAt.toISOString(),
    status: prescription.status,
    notes: prescription.notes,
    createdAt: prescription.createdAt.toISOString(),
    updatedAt: prescription.updatedAt.toISOString(),
    patient: patientSummary(prescription.patient),
    prescribedBy: prescriberSummary(prescription.prescribedBy),
    itemCount: prescription.items.length,
  }
}

export function toPrescriptionListDto(
  prescription: PrescriptionRecord,
): PrescriptionListDto {
  return commonFields(prescription)
}

export function toPrescriptionDetailDto(
  prescription: PrescriptionRecord,
): PrescriptionDetailDto {
  return {
    ...commonFields(prescription),
    items: prescription.items.map((item) => ({
      id: item.id,
      medicineId: item.medicineId,
      dosage: item.dosage,
      route: item.route,
      frequency: item.frequency,
      duration: item.duration,
      instructions: item.instructions,
      quantityPrescribed: item.quantityPrescribed.toString(),
      unit: item.unit,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      medicine: {
        id: item.medicine.id,
        code: item.medicine.code,
        genericName: item.medicine.genericName,
        brandName: item.medicine.brandName,
        dosageForm: item.medicine.dosageForm,
        strength: item.medicine.strength,
        inventoryUnit: item.medicine.inventoryUnit,
        status: item.medicine.status,
      },
    })),
  }
}

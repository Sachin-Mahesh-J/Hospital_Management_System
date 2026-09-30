export const prescriptionStatuses = [
  'active',
  'partially_dispensed',
  'dispensed',
  'cancelled',
  'expired',
] as const
export type PrescriptionStatus = (typeof prescriptionStatuses)[number]

export type PrescriptionPatient = {
  id: string
  patientNumber: string
  firstName: string
  lastName: string
  status: string
}

export type PrescriptionPrescriber = {
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

export type MedicineCatalogItem = {
  id: string
  code: string
  genericName: string
  brandName: string | null
  dosageForm: string
  strength: string | null
  inventoryUnit: string
  status: string
  currency: string
}

export type PrescriptionDispense = {
  id: string
  quantityDispensed: string
  unit: string
  dispensedAt: string
  dispensedByEmployeeId: string
  status: string
  note: string | null
  reversed: boolean
  reversal: {
    id: string
    quantityReversed: string
    reversedAt: string
  } | null
  dispensedBy: {
    id: string
    employeeNumber: string
    firstName: string
    lastName: string
    employmentStatus: string
  }
}

export type PrescriptionItem = {
  id: string
  medicineId: string
  dosage: string
  route: string | null
  frequency: string
  duration: string
  instructions: string | null
  quantityPrescribed: string
  quantityDispensed: string
  quantityRemaining: string
  unit: string
  createdAt: string
  updatedAt: string
  medicine: MedicineCatalogItem
  dispenseRecords: PrescriptionDispense[]
}

export type PrescriptionListItem = {
  id: string
  medicalRecordId: string
  patientId: string
  prescribedByDoctorId: string
  prescribedAt: string
  status: PrescriptionStatus
  notes: string | null
  createdAt: string
  updatedAt: string
  patient: PrescriptionPatient
  prescribedBy: PrescriptionPrescriber
  itemCount: number
}

export type Prescription = PrescriptionListItem & {
  items: PrescriptionItem[]
}

export type PrescriptionItemInput = {
  medicineId: string
  dosage: string
  route?: string | null
  frequency: string
  duration: string
  instructions?: string | null
  quantityPrescribed: string
  unit: string
}

export type PrescriptionInput = {
  medicalRecordId: string
  notes?: string | null
  items: PrescriptionItemInput[]
}

export type PrescriptionFilters = {
  page: number
  pageSize: number
  patientId?: string
  medicalRecordId?: string
  status?: PrescriptionStatus
  sortBy?: 'prescribedAt' | 'createdAt' | 'status'
  sortOrder?: 'asc' | 'desc'
}

export type PrescriptionListResult = {
  data: PrescriptionListItem[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}

export type MedicineFilters = {
  page: number
  pageSize: number
  search?: string
  status?: 'active' | 'inactive'
}

export type MedicineListResult = {
  data: MedicineCatalogItem[]
  pagination: PrescriptionListResult['pagination']
}

export function canCancelPrescription(status: PrescriptionStatus): boolean {
  return status === 'active'
}

export function medicineLabel(medicine: MedicineCatalogItem): string {
  const brand = medicine.brandName ? ` (${medicine.brandName})` : ''
  return `${medicine.genericName}${brand} — ${medicine.code}`
}

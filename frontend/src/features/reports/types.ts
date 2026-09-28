export type Pagination = {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export type PaginatedResult<T> = {
  data: T[]
  pagination: Pagination
}

export type PatientReportRow = {
  id: string
  patientNumber: string
  firstName: string
  lastName: string
  dateOfBirth: string | null
  dateOfBirthPrecision: string
  sexAtRegistration: string | null
  status: string
  createdAt: string
}

export type AppointmentReportRow = {
  id: string
  startsAt: string
  endsAt: string
  status: string
  patient: {
    id: string
    patientNumber: string
    firstName: string
    lastName: string
    status: string
  }
  doctor: {
    id: string
    specialization: string
    status: string
    employee: {
      employeeNumber: string
      firstName: string
      lastName: string
    }
    department: {
      id: string
      code: string
      name: string
    }
  }
}

export type RevenueSummary = {
  currency: string
  paymentCount: number
  totalAmount: string
  byMethod: Array<{
    method: string
    paymentCount: number
    totalAmount: string
  }>
}

export type RevenueReportRow = {
  id: string
  paymentNumber: string
  invoiceNumber: string
  patientNumber: string
  amount: string
  currency: string
  method: string
  paidAt: string
}

export type RevenueReportResult = PaginatedResult<RevenueReportRow> & {
  summary: RevenueSummary
}

export type PharmacyAlertSummary = {
  lowStockMedicineCount: number
  nearExpiryBatchCount: number
  expiredBatchCount: number
}

export type LowStockMedicineRow = {
  id: string
  code: string
  genericName: string
  brandName: string | null
  dosageForm: string
  strength: string | null
  inventoryUnit: string
  status: string
  currentStock: string
  lowStockThreshold: string
}

export type NearExpiryBatchRow = {
  id: string
  batchNumber: string
  expiryDate: string
  availableQuantity: string
  status: string
  medicine: {
    id: string
    code: string
    genericName: string
    brandName: string | null
    inventoryUnit: string
    status: string
  }
}

export type PharmacyReportSection = 'low_stock' | 'near_expiry'

export type PharmacyReportResult = PaginatedResult<
  LowStockMedicineRow | NearExpiryBatchRow
> & {
  summary: PharmacyAlertSummary
  section: PharmacyReportSection
}

export type LaboratoryReportRow = {
  id: string
  requestedAt: string
  status: string
  patient: {
    id: string
    patientNumber: string
    firstName: string
    lastName: string
    status: string
  }
  requestedBy: {
    id: string
    specialization: string
    employee: {
      employeeNumber: string
      firstName: string
      lastName: string
    }
  }
  items: Array<{
    id: string
    status: string
    sampleCollectedAt: string | null
    testCode: string
    testName: string
  }>
}

export type StaffReportRow = {
  id: string
  employeeNumber: string
  firstName: string
  lastName: string
  jobTitle: string
  employmentStatus: string
  hireDate: string
  endDate: string | null
  department: {
    id: string
    code: string
    name: string
    status: string
  }
  doctorProfile: {
    id: string
    licenseNumber: string
    specialization: string
    status: string
  } | null
}

export type Dashboard = {
  hospitalDate: string
  currency: string
  totalPatients?: { count: number }
  todaysAppointments?: { count: number }
  revenueSummary?: {
    currency: string
    paymentCount: number
    totalAmount: string
  }
  laboratoryRequests?: { count: number }
  pharmacyAlerts?: {
    lowStockMedicineCount: number
    nearExpiryBatchCount: number
  }
}

export type PatientReportFilters = {
  page: number
  pageSize: number
  status?: string
}

export type DateReportFilters = {
  page: number
  pageSize: number
  from: string
  to: string
  status?: string
}

export type RevenueReportFilters = {
  page: number
  pageSize: number
  from: string
  to: string
  method?: string
}

export type PharmacyReportFilters = {
  page: number
  pageSize: number
  section: PharmacyReportSection
}

export type StaffReportFilters = {
  page: number
  pageSize: number
  employmentStatus?: string
}

export function personLabel(person: {
  firstName: string
  lastName: string
}): string {
  return `${person.firstName} ${person.lastName}`
}

export function isLowStockRow(
  row: LowStockMedicineRow | NearExpiryBatchRow,
): row is LowStockMedicineRow {
  return 'currentStock' in row
}

import { Prisma } from '@prisma/client'
import { calendarDateUtc } from '../../config/hospitalTime.js'
import type { PaginationMetadata } from '../../api/response.js'
import type { PharmacyReportSection } from './report.constants.js'

function decimalString(value: Prisma.Decimal | string | number): string {
  return new Prisma.Decimal(value).toString()
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

export type RevenueMethodBreakdown = {
  method: string
  paymentCount: number
  totalAmount: string
}

export type RevenueSummary = {
  currency: string
  paymentCount: number
  totalAmount: string
  byMethod: RevenueMethodBreakdown[]
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

export type PharmacyAlertSummary = {
  lowStockMedicineCount: number
  nearExpiryBatchCount: number
  expiredBatchCount: number
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

export type DashboardDto = {
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

export type PaginatedReport<T> = {
  data: T[]
  pagination: PaginationMetadata
}

export type RevenueReportResult = PaginatedReport<RevenueReportRow> & {
  summary: RevenueSummary
}

export type PharmacyReportResult = PaginatedReport<
  LowStockMedicineRow | NearExpiryBatchRow
> & {
  summary: PharmacyAlertSummary
  section: PharmacyReportSection
}

export function toPatientReportRow(patient: {
  id: string
  patientNumber: string
  firstName: string
  lastName: string
  dateOfBirth: Date | null
  dateOfBirthPrecision: string
  sexAtRegistration: string | null
  status: string
  createdAt: Date
}): PatientReportRow {
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
    status: patient.status,
    createdAt: patient.createdAt.toISOString(),
  }
}

export function toAppointmentReportRow(appointment: {
  id: string
  startsAt: Date
  endsAt: Date
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
      department: { id: string; code: string; name: string }
    }
  }
}): AppointmentReportRow {
  return {
    id: appointment.id,
    startsAt: appointment.startsAt.toISOString(),
    endsAt: appointment.endsAt.toISOString(),
    status: appointment.status,
    patient: appointment.patient,
    doctor: {
      id: appointment.doctor.id,
      specialization: appointment.doctor.specialization,
      status: appointment.doctor.status,
      employee: {
        employeeNumber: appointment.doctor.employee.employeeNumber,
        firstName: appointment.doctor.employee.firstName,
        lastName: appointment.doctor.employee.lastName,
      },
      department: appointment.doctor.employee.department,
    },
  }
}

export function toRevenueReportRow(payment: {
  id: string
  paymentNumber: string
  amount: Prisma.Decimal
  currency: string
  method: string
  paidAt: Date
  invoice: {
    invoiceNumber: string
    patient: { patientNumber: string }
  }
}): RevenueReportRow {
  return {
    id: payment.id,
    paymentNumber: payment.paymentNumber,
    invoiceNumber: payment.invoice.invoiceNumber,
    patientNumber: payment.invoice.patient.patientNumber,
    amount: decimalString(payment.amount),
    currency: payment.currency,
    method: payment.method,
    paidAt: payment.paidAt.toISOString(),
  }
}

export function toLowStockMedicineRow(row: {
  id: string
  code: string
  generic_name: string
  brand_name: string | null
  dosage_form: string
  strength: string | null
  inventory_unit: string
  status: string
  current_stock: Prisma.Decimal
  low_stock_threshold: Prisma.Decimal
}): LowStockMedicineRow {
  return {
    id: row.id,
    code: row.code,
    genericName: row.generic_name,
    brandName: row.brand_name,
    dosageForm: row.dosage_form,
    strength: row.strength,
    inventoryUnit: row.inventory_unit,
    status: row.status,
    currentStock: decimalString(row.current_stock),
    lowStockThreshold: decimalString(row.low_stock_threshold),
  }
}

export function toNearExpiryBatchRow(row: {
  id: string
  batch_number: string
  expiry_date: Date
  available_quantity: Prisma.Decimal
  status: string
  medicine_id: string
  code: string
  generic_name: string
  brand_name: string | null
  inventory_unit: string
  medicine_status: string
}): NearExpiryBatchRow {
  return {
    id: row.id,
    batchNumber: row.batch_number,
    expiryDate: calendarDateUtc(row.expiry_date),
    availableQuantity: decimalString(row.available_quantity),
    status: row.status,
    medicine: {
      id: row.medicine_id,
      code: row.code,
      genericName: row.generic_name,
      brandName: row.brand_name,
      inventoryUnit: row.inventory_unit,
      status: row.medicine_status,
    },
  }
}

export function toLaboratoryReportRow(request: {
  id: string
  requestedAt: Date
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
    sampleCollectedAt: Date | null
    testDefinition: { code: string; name: string }
  }>
}): LaboratoryReportRow {
  return {
    id: request.id,
    requestedAt: request.requestedAt.toISOString(),
    status: request.status,
    patient: request.patient,
    requestedBy: {
      id: request.requestedBy.id,
      specialization: request.requestedBy.specialization,
      employee: request.requestedBy.employee,
    },
    items: request.items.map((item) => ({
      id: item.id,
      status: item.status,
      sampleCollectedAt: item.sampleCollectedAt?.toISOString() ?? null,
      testCode: item.testDefinition.code,
      testName: item.testDefinition.name,
    })),
  }
}

export function toStaffReportRow(employee: {
  id: string
  employeeNumber: string
  firstName: string
  lastName: string
  jobTitle: string
  employmentStatus: string
  hireDate: Date
  endDate: Date | null
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
}): StaffReportRow {
  return {
    id: employee.id,
    employeeNumber: employee.employeeNumber,
    firstName: employee.firstName,
    lastName: employee.lastName,
    jobTitle: employee.jobTitle,
    employmentStatus: employee.employmentStatus,
    hireDate: employee.hireDate.toISOString().slice(0, 10),
    endDate: employee.endDate ? employee.endDate.toISOString().slice(0, 10) : null,
    department: employee.department,
    doctorProfile: employee.doctorProfile,
  }
}

export function moneyString(value: Prisma.Decimal | string | number | null): string {
  return decimalString(value ?? 0)
}

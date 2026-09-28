import type { CurrentUser } from '../../auth/currentUser.js'
import { PERMISSIONS } from '../../auth/auth.constants.js'
import { env } from '../../config/env.js'
import {
  addCalendarDays,
  hospitalDateUtcRange,
  hospitalInclusiveDateUtcRange,
  hospitalToday,
} from '../../config/hospitalTime.js'
import { NEAR_EXPIRY_DAYS } from './report.constants.js'
import {
  aggregateRevenue,
  countAppointmentsInRange,
  countExpiredBatches,
  countLaboratoryRequests,
  countLowStockMedicines,
  countNearExpiryBatches,
  countPatients,
  listAppointmentReport as listAppointmentRecords,
  listLaboratoryReport as listLaboratoryRecords,
  listLowStockMedicines,
  listNearExpiryBatches,
  listPatientReport as listPatientRecords,
  listRevenueReport as listRevenueRecords,
  listStaffReport as listStaffRecords,
  revenueWhere,
} from './report.repository.js'
import type {
  ListAppointmentReportQuery,
  ListLaboratoryReportQuery,
  ListPatientReportQuery,
  ListPharmacyReportQuery,
  ListRevenueReportQuery,
  ListStaffReportQuery,
} from './report.schemas.js'
import {
  moneyString,
  toAppointmentReportRow,
  toLaboratoryReportRow,
  toLowStockMedicineRow,
  toNearExpiryBatchRow,
  toPatientReportRow,
  toRevenueReportRow,
  toStaffReportRow,
  type DashboardDto,
  type PaginatedReport,
  type PatientReportRow,
  type AppointmentReportRow,
  type LaboratoryReportRow,
  type StaffReportRow,
  type PharmacyReportResult,
  type RevenueReportResult,
} from './report.types.js'

function pagination(page: number, pageSize: number, totalItems: number) {
  return {
    page,
    pageSize,
    totalItems,
    totalPages: Math.ceil(totalItems / pageSize),
  }
}

export async function getPatientReport(
  query: ListPatientReportQuery,
): Promise<PaginatedReport<PatientReportRow>> {
  const result = await listPatientRecords(query)
  return {
    data: result.patients.map(toPatientReportRow),
    pagination: pagination(query.page, query.pageSize, result.totalItems),
  }
}

export async function getAppointmentReport(
  query: ListAppointmentReportQuery,
): Promise<PaginatedReport<AppointmentReportRow>> {
  const range = hospitalInclusiveDateUtcRange(query.from, query.to)
  const result = await listAppointmentRecords(query, range)
  return {
    data: result.appointments.map(toAppointmentReportRow),
    pagination: pagination(query.page, query.pageSize, result.totalItems),
  }
}

export async function getRevenueReport(
  query: ListRevenueReportQuery,
): Promise<RevenueReportResult> {
  const range = hospitalInclusiveDateUtcRange(query.from, query.to)
  const result = await listRevenueRecords(query, range)
  const { totals, byMethod } = await aggregateRevenue(result.where)
  return {
    data: result.payments.map(toRevenueReportRow),
    pagination: pagination(query.page, query.pageSize, result.totalItems),
    summary: {
      currency: env.hospital.defaultCurrency,
      paymentCount: totals._count._all,
      totalAmount: moneyString(totals._sum.amount),
      byMethod: byMethod.map((row) => ({
        method: row.method,
        paymentCount: row._count._all,
        totalAmount: moneyString(row._sum.amount),
      })),
    },
  }
}

export async function getPharmacyReport(
  query: ListPharmacyReportQuery,
): Promise<PharmacyReportResult> {
  const today = hospitalToday()
  const nearExpiryEnd = addCalendarDays(today, NEAR_EXPIRY_DAYS)
  const [lowStockMedicineCount, nearExpiryBatchCount, expiredBatchCount] =
    await Promise.all([
      countLowStockMedicines(),
      countNearExpiryBatches(today, nearExpiryEnd),
      countExpiredBatches(today),
    ])
  const summary = {
    lowStockMedicineCount,
    nearExpiryBatchCount,
    expiredBatchCount,
  }

  if (query.section === 'near_expiry') {
    const result = await listNearExpiryBatches(query, today, nearExpiryEnd)
    return {
      section: query.section,
      summary,
      data: result.rows.map(toNearExpiryBatchRow),
      pagination: pagination(query.page, query.pageSize, result.totalItems),
    }
  }

  const result = await listLowStockMedicines(query)
  return {
    section: query.section,
    summary,
    data: result.rows.map(toLowStockMedicineRow),
    pagination: pagination(query.page, query.pageSize, result.totalItems),
  }
}

export async function getLaboratoryReport(
  query: ListLaboratoryReportQuery,
): Promise<PaginatedReport<LaboratoryReportRow>> {
  const range = hospitalInclusiveDateUtcRange(query.from, query.to)
  const result = await listLaboratoryRecords(query, range)
  return {
    data: result.requests.map(toLaboratoryReportRow),
    pagination: pagination(query.page, query.pageSize, result.totalItems),
  }
}

export async function getStaffReport(
  query: ListStaffReportQuery,
): Promise<PaginatedReport<StaffReportRow>> {
  const result = await listStaffRecords(query)
  return {
    data: result.employees.map(toStaffReportRow),
    pagination: pagination(query.page, query.pageSize, result.totalItems),
  }
}

export async function getDashboard(
  user: CurrentUser,
): Promise<DashboardDto> {
  const hospitalDate = hospitalToday()
  const todayRange = hospitalDateUtcRange(hospitalDate)
  const nearExpiryEnd = addCalendarDays(hospitalDate, NEAR_EXPIRY_DAYS)
  const permissions = new Set(user.permissions)
  const dashboard: DashboardDto = {
    hospitalDate,
    currency: env.hospital.defaultCurrency,
  }

  const tasks: Array<Promise<void>> = []

  if (permissions.has(PERMISSIONS.reportPatientRead)) {
    tasks.push(
      countPatients().then((count) => {
        dashboard.totalPatients = { count }
      }),
    )
  }
  if (permissions.has(PERMISSIONS.reportAppointmentRead)) {
    tasks.push(
      countAppointmentsInRange(todayRange).then((count) => {
        dashboard.todaysAppointments = { count }
      }),
    )
  }
  if (permissions.has(PERMISSIONS.reportRevenueRead)) {
    tasks.push(
      aggregateRevenue(revenueWhere()).then(({ totals }) => {
        dashboard.revenueSummary = {
          currency: env.hospital.defaultCurrency,
          paymentCount: totals._count._all,
          totalAmount: moneyString(totals._sum.amount),
        }
      }),
    )
  }
  if (permissions.has(PERMISSIONS.reportLaboratoryRead)) {
    tasks.push(
      countLaboratoryRequests().then((count) => {
        dashboard.laboratoryRequests = { count }
      }),
    )
  }
  if (permissions.has(PERMISSIONS.reportPharmacyRead)) {
    tasks.push(
      Promise.all([
        countLowStockMedicines(),
        countNearExpiryBatches(hospitalDate, nearExpiryEnd),
      ]).then(([lowStockMedicineCount, nearExpiryBatchCount]) => {
        dashboard.pharmacyAlerts = {
          lowStockMedicineCount,
          nearExpiryBatchCount,
        }
      }),
    )
  }

  await Promise.all(tasks)
  return dashboard
}

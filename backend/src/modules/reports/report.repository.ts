import { Prisma } from '@prisma/client'
import { env } from '../../config/env.js'
import { database } from '../../database/database.service.js'
import type {
  ListAppointmentReportQuery,
  ListLaboratoryReportQuery,
  ListPatientReportQuery,
  ListPharmacyReportQuery,
  ListRevenueReportQuery,
  ListStaffReportQuery,
} from './report.schemas.js'

type DateRange = { start: Date; end: Date }

function paginationOffset(page: number, pageSize: number): number {
  return (page - 1) * pageSize
}

const effectiveRevenueWhere = {
  status: 'recorded',
  reversesPaymentId: null,
  currency: env.hospital.defaultCurrency,
  invoice: { status: { not: 'void' } },
} satisfies Prisma.PaymentWhereInput

export function revenueWhere(
  range?: DateRange,
  method?: string,
): Prisma.PaymentWhereInput {
  return {
    ...effectiveRevenueWhere,
    ...(range
      ? { paidAt: { gte: range.start, lt: range.end } }
      : {}),
    ...(method ? { method } : {}),
  }
}

export async function countPatients(status?: string): Promise<number> {
  return database.client.patient.count({
    where: status ? { status } : {},
  })
}

export async function listPatientReport(query: ListPatientReportQuery) {
  const where: Prisma.PatientWhereInput = query.status
    ? { status: query.status }
    : {}
  const totalItems = await database.client.patient.count({ where })
  const offset = paginationOffset(query.page, query.pageSize)
  const patients =
    offset >= totalItems
      ? []
      : await database.client.patient.findMany({
          where,
          skip: offset,
          take: query.pageSize,
          orderBy: [{ lastName: 'asc' }, { patientNumber: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            patientNumber: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            dateOfBirthPrecision: true,
            sexAtRegistration: true,
            status: true,
            createdAt: true,
          },
        })
  return { patients, totalItems }
}

export async function countAppointmentsInRange(
  range: DateRange,
  status?: string,
): Promise<number> {
  return database.client.appointment.count({
    where: {
      startsAt: { gte: range.start, lt: range.end },
      ...(status ? { status } : {}),
    },
  })
}

export async function listAppointmentReport(
  query: ListAppointmentReportQuery,
  range: DateRange,
) {
  const where: Prisma.AppointmentWhereInput = {
    startsAt: { gte: range.start, lt: range.end },
    ...(query.status ? { status: query.status } : {}),
  }
  const totalItems = await database.client.appointment.count({ where })
  const offset = paginationOffset(query.page, query.pageSize)
  const appointments =
    offset >= totalItems
      ? []
      : await database.client.appointment.findMany({
          where,
          skip: offset,
          take: query.pageSize,
          orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            startsAt: true,
            endsAt: true,
            status: true,
            patient: {
              select: {
                id: true,
                patientNumber: true,
                firstName: true,
                lastName: true,
                status: true,
              },
            },
            doctor: {
              select: {
                id: true,
                specialization: true,
                status: true,
                employee: {
                  select: {
                    employeeNumber: true,
                    firstName: true,
                    lastName: true,
                    department: {
                      select: { id: true, code: true, name: true },
                    },
                  },
                },
              },
            },
          },
        })
  return { appointments, totalItems }
}

export async function aggregateRevenue(where: Prisma.PaymentWhereInput) {
  const [totals, byMethod] = await Promise.all([
    database.client.payment.aggregate({
      where,
      _sum: { amount: true },
      _count: { _all: true },
    }),
    database.client.payment.groupBy({
      by: ['method'],
      where,
      _sum: { amount: true },
      _count: { _all: true },
      orderBy: { method: 'asc' },
    }),
  ])
  return { totals, byMethod }
}

export async function listRevenueReport(
  query: ListRevenueReportQuery,
  range: DateRange,
) {
  const where = revenueWhere(range, query.method)
  const totalItems = await database.client.payment.count({ where })
  const offset = paginationOffset(query.page, query.pageSize)
  const payments =
    offset >= totalItems
      ? []
      : await database.client.payment.findMany({
          where,
          skip: offset,
          take: query.pageSize,
          orderBy: [{ paidAt: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            paymentNumber: true,
            amount: true,
            currency: true,
            method: true,
            paidAt: true,
            invoice: {
              select: {
                invoiceNumber: true,
                patient: { select: { patientNumber: true } },
              },
            },
          },
        })
  return { payments, totalItems, where }
}

export async function countLaboratoryRequests(
  range?: DateRange,
  status?: string,
): Promise<number> {
  return database.client.labRequest.count({
    where: {
      ...(range ? { requestedAt: { gte: range.start, lt: range.end } } : {}),
      ...(status ? { status } : {}),
    },
  })
}

export async function listLaboratoryReport(
  query: ListLaboratoryReportQuery,
  range: DateRange,
) {
  const where: Prisma.LabRequestWhereInput = {
    requestedAt: { gte: range.start, lt: range.end },
    ...(query.status ? { status: query.status } : {}),
  }
  const totalItems = await database.client.labRequest.count({ where })
  const offset = paginationOffset(query.page, query.pageSize)
  const requests =
    offset >= totalItems
      ? []
      : await database.client.labRequest.findMany({
          where,
          skip: offset,
          take: query.pageSize,
          orderBy: [{ requestedAt: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            requestedAt: true,
            status: true,
            patient: {
              select: {
                id: true,
                patientNumber: true,
                firstName: true,
                lastName: true,
                status: true,
              },
            },
            requestedBy: {
              select: {
                id: true,
                specialization: true,
                employee: {
                  select: {
                    employeeNumber: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
            items: {
              select: {
                id: true,
                status: true,
                sampleCollectedAt: true,
                testDefinition: { select: { code: true, name: true } },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
        })
  return { requests, totalItems }
}

export async function listStaffReport(query: ListStaffReportQuery) {
  const where: Prisma.EmployeeWhereInput = {
    ...(query.employmentStatus
      ? { employmentStatus: query.employmentStatus }
      : {}),
    ...(query.departmentId ? { departmentId: query.departmentId } : {}),
  }
  const totalItems = await database.client.employee.count({ where })
  const offset = paginationOffset(query.page, query.pageSize)
  const employees =
    offset >= totalItems
      ? []
      : await database.client.employee.findMany({
          where,
          skip: offset,
          take: query.pageSize,
          orderBy: [{ lastName: 'asc' }, { employeeNumber: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
            jobTitle: true,
            employmentStatus: true,
            hireDate: true,
            endDate: true,
            department: {
              select: { id: true, code: true, name: true, status: true },
            },
            doctorProfile: {
              select: {
                id: true,
                licenseNumber: true,
                specialization: true,
                status: true,
              },
            },
          },
        })
  return { employees, totalItems }
}

type LowStockRow = {
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
}

type NearExpiryRow = {
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
}

export async function countLowStockMedicines(): Promise<number> {
  const rows = await database.client.$queryRaw<Array<{ total: bigint }>>`
    SELECT COUNT(*)::bigint AS total
    FROM (
      SELECT m."id"
      FROM "medicines" m
      LEFT JOIN "medicine_batches" b ON b."medicine_id" = m."id"
      LEFT JOIN "stock_movements" sm ON sm."medicine_batch_id" = b."id"
      GROUP BY m."id"
      HAVING COALESCE(SUM(sm."quantity"), 0) <= m."low_stock_threshold"
         AND m."low_stock_threshold" > 0
    ) counted
  `
  return Number(rows[0]?.total ?? 0)
}

export async function listLowStockMedicines(query: ListPharmacyReportQuery) {
  const totalItems = await countLowStockMedicines()
  const offset = paginationOffset(query.page, query.pageSize)
  if (offset >= totalItems) {
    return { rows: [] as LowStockRow[], totalItems }
  }
  const rows = await database.client.$queryRaw<LowStockRow[]>`
    SELECT
      m."id",
      m."code",
      m."generic_name",
      m."brand_name",
      m."dosage_form",
      m."strength",
      m."inventory_unit",
      m."status",
      COALESCE(SUM(sm."quantity"), 0) AS current_stock,
      m."low_stock_threshold"
    FROM "medicines" m
    LEFT JOIN "medicine_batches" b ON b."medicine_id" = m."id"
    LEFT JOIN "stock_movements" sm ON sm."medicine_batch_id" = b."id"
    GROUP BY m."id"
    HAVING COALESCE(SUM(sm."quantity"), 0) <= m."low_stock_threshold"
       AND m."low_stock_threshold" > 0
    ORDER BY m."generic_name" ASC, m."code" ASC, m."id" ASC
    OFFSET ${offset}
    LIMIT ${query.pageSize}
  `
  return { rows, totalItems }
}

export async function countNearExpiryBatches(
  today: string,
  nearExpiryEnd: string,
): Promise<number> {
  const rows = await database.client.$queryRaw<Array<{ total: bigint }>>`
    SELECT COUNT(*)::bigint AS total
    FROM (
      SELECT b."id"
      FROM "medicine_batches" b
      LEFT JOIN "stock_movements" sm ON sm."medicine_batch_id" = b."id"
      GROUP BY b."id"
      HAVING COALESCE(SUM(sm."quantity"), 0) > 0
         AND b."expiry_date" >= ${today}::date
         AND b."expiry_date" <= ${nearExpiryEnd}::date
    ) counted
  `
  return Number(rows[0]?.total ?? 0)
}

export async function listNearExpiryBatches(
  query: ListPharmacyReportQuery,
  today: string,
  nearExpiryEnd: string,
) {
  const totalItems = await countNearExpiryBatches(today, nearExpiryEnd)
  const offset = paginationOffset(query.page, query.pageSize)
  if (offset >= totalItems) {
    return { rows: [] as NearExpiryRow[], totalItems }
  }
  const rows = await database.client.$queryRaw<NearExpiryRow[]>`
    SELECT
      b."id",
      b."batch_number",
      b."expiry_date",
      COALESCE(SUM(sm."quantity"), 0) AS available_quantity,
      b."status",
      b."medicine_id",
      m."code",
      m."generic_name",
      m."brand_name",
      m."inventory_unit",
      m."status" AS medicine_status
    FROM "medicine_batches" b
    INNER JOIN "medicines" m ON m."id" = b."medicine_id"
    LEFT JOIN "stock_movements" sm ON sm."medicine_batch_id" = b."id"
    GROUP BY b."id", m."id"
    HAVING COALESCE(SUM(sm."quantity"), 0) > 0
       AND b."expiry_date" >= ${today}::date
       AND b."expiry_date" <= ${nearExpiryEnd}::date
    ORDER BY b."expiry_date" ASC, b."batch_number" ASC, b."id" ASC
    OFFSET ${offset}
    LIMIT ${query.pageSize}
  `
  return { rows, totalItems }
}

export async function countExpiredBatches(today: string): Promise<number> {
  const rows = await database.client.$queryRaw<Array<{ total: bigint }>>`
    SELECT COUNT(*)::bigint AS total
    FROM (
      SELECT b."id"
      FROM "medicine_batches" b
      LEFT JOIN "stock_movements" sm ON sm."medicine_batch_id" = b."id"
      GROUP BY b."id"
      HAVING COALESCE(SUM(sm."quantity"), 0) > 0
         AND b."expiry_date" < ${today}::date
    ) counted
  `
  return Number(rows[0]?.total ?? 0)
}

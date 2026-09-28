import { z } from 'zod'
import {
  calendarDaysInclusive,
} from '../../config/hospitalTime.js'
import { APPOINTMENT_STATUSES } from '../appointments/appointment.schemas.js'
import { PAYMENT_METHODS } from '../billing/billing.lifecycle.js'
import { EMPLOYMENT_STATUSES } from '../employees/employee.schemas.js'
import { LAB_REQUEST_STATUSES } from '../laboratory/laboratory.lifecycle.js'
import { PATIENT_STATUSES } from '../patients/patient.schemas.js'
import {
  MAX_REPORT_RANGE_DAYS,
  PHARMACY_REPORT_SECTIONS,
} from './report.constants.js'

const calendarDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be a valid date in YYYY-MM-DD format.')
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`)
    return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().startsWith(value)
  }, 'Must be a valid calendar date.')

const paginationFields = {
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
}

const dateRangeFields = {
  from: calendarDateSchema,
  to: calendarDateSchema,
}

function validBoundedDateRange(input: { from: string; to: string }): boolean {
  return input.from <= input.to
}

function withinMaxRange(input: { from: string; to: string }): boolean {
  return calendarDaysInclusive(input.from, input.to) <= MAX_REPORT_RANGE_DAYS
}

export const listPatientReportQuerySchema = z
  .object({
    ...paginationFields,
    status: z.enum(PATIENT_STATUSES).optional(),
  })
  .strict()

export const listAppointmentReportQuerySchema = z
  .object({
    ...paginationFields,
    ...dateRangeFields,
    status: z.enum(APPOINTMENT_STATUSES).optional(),
  })
  .strict()
  .refine(validBoundedDateRange, {
    message: '`to` must be on or after `from`.',
    path: ['to'],
  })
  .refine(withinMaxRange, {
    message: `Date range cannot exceed ${MAX_REPORT_RANGE_DAYS} days.`,
    path: ['to'],
  })

export const listRevenueReportQuerySchema = z
  .object({
    ...paginationFields,
    ...dateRangeFields,
    method: z.enum(PAYMENT_METHODS).optional(),
  })
  .strict()
  .refine(validBoundedDateRange, {
    message: '`to` must be on or after `from`.',
    path: ['to'],
  })
  .refine(withinMaxRange, {
    message: `Date range cannot exceed ${MAX_REPORT_RANGE_DAYS} days.`,
    path: ['to'],
  })

export const listPharmacyReportQuerySchema = z
  .object({
    ...paginationFields,
    section: z.enum(PHARMACY_REPORT_SECTIONS).default('low_stock'),
  })
  .strict()

export const listLaboratoryReportQuerySchema = z
  .object({
    ...paginationFields,
    ...dateRangeFields,
    status: z.enum(LAB_REQUEST_STATUSES).optional(),
  })
  .strict()
  .refine(validBoundedDateRange, {
    message: '`to` must be on or after `from`.',
    path: ['to'],
  })
  .refine(withinMaxRange, {
    message: `Date range cannot exceed ${MAX_REPORT_RANGE_DAYS} days.`,
    path: ['to'],
  })

export const listStaffReportQuerySchema = z
  .object({
    ...paginationFields,
    employmentStatus: z.enum(EMPLOYMENT_STATUSES).optional(),
    departmentId: z.string().uuid().optional(),
  })
  .strict()

export const dashboardQuerySchema = z.object({}).strict()

export type ListPatientReportQuery = z.infer<typeof listPatientReportQuerySchema>
export type ListAppointmentReportQuery = z.infer<
  typeof listAppointmentReportQuerySchema
>
export type ListRevenueReportQuery = z.infer<typeof listRevenueReportQuerySchema>
export type ListPharmacyReportQuery = z.infer<typeof listPharmacyReportQuerySchema>
export type ListLaboratoryReportQuery = z.infer<
  typeof listLaboratoryReportQuerySchema
>
export type ListStaffReportQuery = z.infer<typeof listStaffReportQuerySchema>

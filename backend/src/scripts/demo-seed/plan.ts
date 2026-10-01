import { addCalendarDays } from '../../config/hospitalTime.js'
import { DEMO_ACCOUNTS } from './accounts.js'
import { APPLICATION_TABLES } from './clear.js'

const ACTIVE_SCHEDULE_DOCTORS = [
  'docGen',
  'docCard',
  'docPaed',
  'docOrth',
  'docDerm',
  'docGen2',
  'docCard2',
] as const

const AFTERNOON_SCHEDULE_DOCTORS = new Set(['docGen', 'docCard', 'docPaed'])

export const EXPECTED_SEED_OPERATION_COUNTS: Record<string, number> = {
  users: 14,
  userRoles: 14,
  departments: 11,
  employees: 20,
  doctors: 8,
  patients: 32,
  appointments: 68,
  admissions: 12,
  medicalRecords: 19,
  medicalReports: 5,
  diagnoses: 19,
  treatments: 17,
  labTests: 12,
  labRequests: 13,
  labRequestItems: 23,
  labResults: 17,
  medicines: 14,
  batches: 15,
  stockMovements: 26,
  prescriptions: 12,
  prescriptionItems: 19,
  dispenses: 9,
  dispenseReversals: 1,
  invoices: 17,
  invoiceItems: 17,
  payments: 12,
  attendance: 59,
  leave: 15,
  documents: 11,
  auditLogs: 14,
}

function weekdayUtc(calendarDate: string): number {
  return new Date(`${calendarDate}T00:00:00.000Z`).getUTCDay()
}

function calendarDates(from: string, to: string): string[] {
  const dates: string[] = []
  let current = from
  while (current <= to) {
    dates.push(current)
    current = addCalendarDays(current, 1)
  }
  return dates
}

export function expectedScheduleCount(today: string): number {
  const from = addCalendarDays(today, -21)
  const to = addCalendarDays(today, 21)
  let count = 0
  for (const doctor of ACTIVE_SCHEDULE_DOCTORS) {
    for (const date of calendarDates(from, to)) {
      const day = weekdayUtc(date)
      if (day === 0) continue
      if (day === 6 && doctor !== 'docGen') continue
      count += 1
      if (AFTERNOON_SCHEDULE_DOCTORS.has(doctor) && day !== 6) {
        count += 1
      }
    }
  }
  return count + 2
}

export function expectedSeedOperationCounts(
  today: string,
): Record<string, number> {
  return {
    ...EXPECTED_SEED_OPERATION_COUNTS,
    schedules: expectedScheduleCount(today),
  }
}

export function expectedApplicationRowCounts(
  today: string,
): Record<string, number> {
  const schedules = expectedScheduleCount(today)
  return {
    payments: 12,
    invoice_items: 17,
    invoices: 17,
    stock_movements: 26,
    dispense_reversals: 1,
    dispense_records: 9,
    prescription_items: 19,
    prescriptions: 12,
    lab_results: 17,
    lab_request_items: 23,
    lab_requests: 13,
    diagnoses: 19,
    treatments: 17,
    medical_reports: 5,
    medical_records: 19,
    patient_documents: 11,
    appointments: 68,
    admissions: 12,
    patients: 32,
    doctor_schedules: schedules,
    attendance_records: 59,
    leave_records: 15,
    doctor_profiles: 8,
    employees: 20,
    refresh_sessions: 0,
    audit_logs: 14,
    user_roles: 14,
    users: 14,
    departments: 11,
    medicine_batches: 15,
    medicines: 14,
    lab_test_definitions: 12,
  }
}

export function tablesThatWouldBeCleared(): readonly string[] {
  return APPLICATION_TABLES
}

export function demoUsernamesThatWouldBeCreated(): string[] {
  return DEMO_ACCOUNTS.map((account) => account.username)
}

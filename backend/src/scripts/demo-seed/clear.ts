import type { PrismaClient } from '@prisma/client'

export const PRESERVED_TABLES = [
  'roles',
  'permissions',
  'role_permissions',
] as const

export const APPLICATION_TABLES = [
  'payments',
  'invoice_items',
  'invoices',
  'stock_movements',
  'dispense_reversals',
  'dispense_records',
  'prescription_items',
  'prescriptions',
  'lab_results',
  'lab_request_items',
  'lab_requests',
  'diagnoses',
  'treatments',
  'medical_reports',
  'medical_records',
  'patient_documents',
  'appointments',
  'admissions',
  'patients',
  'doctor_schedules',
  'attendance_records',
  'leave_records',
  'doctor_profiles',
  'employees',
  'refresh_sessions',
  'audit_logs',
  'user_roles',
  'users',
  'departments',
  'medicine_batches',
  'medicines',
  'lab_test_definitions',
] as const

export type TableCount = {
  table: string
  count: number
}

async function countTable(
  client: PrismaClient,
  table: string,
): Promise<number> {
  const rows = await client.$queryRawUnsafe<Array<{ total: bigint }>>(
    `SELECT COUNT(*)::bigint AS total FROM "${table}"`,
  )
  return Number(rows[0]?.total ?? 0)
}

export async function countApplicationData(
  client: PrismaClient,
): Promise<TableCount[]> {
  const counts: TableCount[] = []
  for (const table of APPLICATION_TABLES) {
    counts.push({ table, count: await countTable(client, table) })
  }
  return counts
}

export async function countPreservedCatalog(
  client: PrismaClient,
): Promise<TableCount[]> {
  const counts: TableCount[] = []
  for (const table of PRESERVED_TABLES) {
    counts.push({ table, count: await countTable(client, table) })
  }
  return counts
}

export async function clearApplicationData(
  client: PrismaClient,
): Promise<void> {
  await client.$transaction(
    async (tx) => {
      await tx.payment.deleteMany({ where: { reversesPaymentId: { not: null } } })
      await tx.payment.deleteMany()
      await tx.invoiceItem.deleteMany()
      await tx.invoice.deleteMany()
      await tx.stockMovement.deleteMany()
      await tx.dispenseReversal.deleteMany()
      await tx.dispenseRecord.deleteMany()
      await tx.prescriptionItem.deleteMany()
      await tx.prescription.deleteMany()
      await tx.labResult.deleteMany({
        where: { supersedesLabResultId: { not: null } },
      })
      await tx.labResult.deleteMany()
      await tx.labRequestItem.deleteMany()
      await tx.labRequest.deleteMany()
      await tx.diagnosis.deleteMany()
      await tx.treatment.deleteMany()
      await tx.medicalReport.deleteMany()
      await tx.medicalRecord.deleteMany({
        where: { amendsMedicalRecordId: { not: null } },
      })
      await tx.medicalRecord.deleteMany()
      await tx.patientDocument.deleteMany()
      await tx.appointment.deleteMany({
        where: { rescheduledFromAppointmentId: { not: null } },
      })
      await tx.appointment.deleteMany()
      await tx.admission.deleteMany()
      await tx.patient.deleteMany()
      await tx.doctorSchedule.deleteMany()
      await tx.attendanceRecord.deleteMany()
      await tx.leaveRecord.deleteMany()
      await tx.doctorProfile.deleteMany()
      await tx.employee.deleteMany()
      await tx.refreshSession.deleteMany()
      await tx.auditLog.deleteMany()
      await tx.userRole.deleteMany()
      await tx.user.deleteMany()
      await tx.department.deleteMany()
      await tx.medicineBatch.deleteMany()
      await tx.medicine.deleteMany()
      await tx.labTestDefinition.deleteMany()
    },
    { timeout: 120_000, maxWait: 20_000 },
  )
}

import type { Prisma } from '@prisma/client'
import { PERMISSIONS } from './auth.constants.js'

export const SYSTEM_ROLES = [
  ['administrator', 'Administrator', 'Manages HMS identity and access.'],
  ['doctor', 'Doctor', 'Clinical doctor role.'],
  ['nurse', 'Nurse', 'Nursing staff role.'],
  ['receptionist', 'Receptionist', 'Reception staff role.'],
  ['laboratory_staff', 'Laboratory Staff', 'Laboratory staff role.'],
  ['pharmacist', 'Pharmacist', 'Pharmacy staff role.'],
  ['accountant', 'Accountant', 'Accounting staff role.'],
] as const

export const APPROVED_PERMISSIONS = [
  [PERMISSIONS.identitySelfRead, 'Read own identity and access profile.'],
  [
    PERMISSIONS.identityPasswordChange,
    'Change own password after current-password verification.',
  ],
  [PERMISSIONS.patientRead, 'Read and search patient demographic records.'],
  [PERMISSIONS.patientCreate, 'Register patient demographic records.'],
  [PERMISSIONS.patientUpdate, 'Update patient demographics and status.'],
  [PERMISSIONS.departmentRead, 'Read hospital departments.'],
  [PERMISSIONS.departmentCreate, 'Create hospital departments.'],
  [PERMISSIONS.departmentUpdate, 'Update hospital departments and status.'],
  [PERMISSIONS.employeeRead, 'Read and search employee records.'],
  [PERMISSIONS.employeeCreate, 'Register employee records.'],
  [PERMISSIONS.employeeUpdate, 'Update employee records, department, and status.'],
  [PERMISSIONS.doctorRead, 'Read doctor profiles and department association.'],
  [PERMISSIONS.doctorCreate, 'Create doctor profiles for existing employees.'],
  [PERMISSIONS.doctorUpdate, 'Update doctor profiles and status.'],
  [PERMISSIONS.doctorScheduleRead, 'Read explicit doctor schedule intervals.'],
  [PERMISSIONS.doctorScheduleCreate, 'Create explicit doctor schedule intervals.'],
  [PERMISSIONS.doctorScheduleUpdate, 'Update explicit doctor schedule intervals.'],
  [PERMISSIONS.appointmentRead, 'Read and search appointments.'],
  [PERMISSIONS.appointmentCreate, 'Book appointments.'],
  [PERMISSIONS.appointmentUpdate, 'Update ordinary appointment fields.'],
  [PERMISSIONS.appointmentCancel, 'Cancel eligible appointments.'],
  [PERMISSIONS.appointmentReschedule, 'Reschedule eligible appointments.'],
  [PERMISSIONS.appointmentStatusUpdate, 'Apply approved appointment status transitions.'],
  [PERMISSIONS.medicalRecordRead, 'Read medical records and draft/final clinical children.'],
  [PERMISSIONS.medicalRecordCreate, 'Create draft medical records for a linked employee author.'],
  [PERMISSIONS.medicalRecordUpdate, 'Update draft medical records and replace draft clinical children.'],
  [PERMISSIONS.medicalRecordFinalize, 'Finalize draft medical records.'],
  [PERMISSIONS.medicalRecordAmend, 'Amend a finalized medical record with a linked successor.'],
  [PERMISSIONS.prescriptionRead, 'Read prescriptions and prescription items.'],
  [PERMISSIONS.prescriptionCreate, 'Create prescriptions from finalized medical records.'],
  [PERMISSIONS.prescriptionCancel, 'Cancel active prescriptions.'],
  [PERMISSIONS.medicineRead, 'Read the active medicine catalog for prescribing and pharmacy operations.'],
  [PERMISSIONS.inventoryRead, 'Read pharmacy inventory batches and derived available stock.'],
  [PERMISSIONS.stockReceive, 'Receive medicine stock into a batch and append a receipt movement.'],
  [PERMISSIONS.stockAdjust, 'Append a stock adjustment movement with a required reason.'],
  [PERMISSIONS.stockMovementRead, 'Read append-only pharmacy stock movements.'],
  [PERMISSIONS.prescriptionDispense, 'Dispense remaining prescription quantity from eligible stock.'],
  [PERMISSIONS.prescriptionReverse, 'Fully reverse a completed dispense and restore stock.'],
  [PERMISSIONS.labTestRead, 'Read the active laboratory test catalog for requesting tests.'],
  [PERMISSIONS.labRequestRead, 'Read laboratory requests, nested results, and assembled reports.'],
  [PERMISSIONS.labRequestCreate, 'Create laboratory requests from a linked doctor profile.'],
  [PERMISSIONS.labSampleCollect, 'Record sample collection for a laboratory request item.'],
  [PERMISSIONS.labResultEnter, 'Enter a laboratory result for a collected request item.'],
  [PERMISSIONS.invoiceRead, 'Read billing-safe invoices and billable-source lookups.'],
  [PERMISSIONS.invoiceCreate, 'Create draft invoices.'],
  [PERMISSIONS.invoiceUpdate, 'Update draft invoices only.'],
  [PERMISSIONS.invoiceIssue, 'Issue draft invoices.'],
  [PERMISSIONS.invoiceVoid, 'Void invoices according to billing policy.'],
  [PERMISSIONS.paymentRead, 'Read invoice payments and printable receipt data.'],
  [PERMISSIONS.paymentCreate, 'Record payments against issued invoices.'],
  [PERMISSIONS.paymentReverse, 'Fully reverse a recorded payment.'],
  [PERMISSIONS.admissionRead, 'Read inpatient admission records.'],
  [PERMISSIONS.admissionCreate, 'Register inpatient admissions.'],
  [PERMISSIONS.admissionUpdate, 'Update ordinary admission fields while admitted.'],
  [PERMISSIONS.admissionDischarge, 'Discharge an admitted inpatient.'],
  [PERMISSIONS.admissionCancel, 'Cancel an admitted inpatient admission.'],
] as const

export const ROLE_PERMISSION_CODES: Record<
  (typeof SYSTEM_ROLES)[number][0],
  readonly string[]
> = {
  administrator: [
    PERMISSIONS.identitySelfRead,
    PERMISSIONS.identityPasswordChange,
    PERMISSIONS.patientRead,
    PERMISSIONS.patientCreate,
    PERMISSIONS.patientUpdate,
    PERMISSIONS.departmentRead,
    PERMISSIONS.departmentCreate,
    PERMISSIONS.departmentUpdate,
    PERMISSIONS.employeeRead,
    PERMISSIONS.employeeCreate,
    PERMISSIONS.employeeUpdate,
    PERMISSIONS.doctorRead,
    PERMISSIONS.doctorCreate,
    PERMISSIONS.doctorUpdate,
    PERMISSIONS.doctorScheduleRead,
    PERMISSIONS.doctorScheduleCreate,
    PERMISSIONS.doctorScheduleUpdate,
    PERMISSIONS.appointmentRead,
    PERMISSIONS.appointmentCreate,
    PERMISSIONS.appointmentUpdate,
    PERMISSIONS.appointmentCancel,
    PERMISSIONS.appointmentReschedule,
    PERMISSIONS.appointmentStatusUpdate,
    PERMISSIONS.medicalRecordRead,
    PERMISSIONS.prescriptionRead,
    PERMISSIONS.labRequestRead,
    PERMISSIONS.inventoryRead,
    PERMISSIONS.stockAdjust,
    PERMISSIONS.stockMovementRead,
    PERMISSIONS.prescriptionReverse,
    PERMISSIONS.invoiceRead,
    PERMISSIONS.invoiceVoid,
    PERMISSIONS.paymentRead,
    PERMISSIONS.paymentReverse,
  ],
  receptionist: [
    PERMISSIONS.identitySelfRead,
    PERMISSIONS.identityPasswordChange,
    PERMISSIONS.patientRead,
    PERMISSIONS.patientCreate,
    PERMISSIONS.patientUpdate,
    PERMISSIONS.departmentRead,
    PERMISSIONS.doctorRead,
    PERMISSIONS.doctorScheduleRead,
    PERMISSIONS.appointmentRead,
    PERMISSIONS.appointmentCreate,
    PERMISSIONS.appointmentUpdate,
    PERMISSIONS.appointmentCancel,
    PERMISSIONS.appointmentReschedule,
    PERMISSIONS.appointmentStatusUpdate,
    PERMISSIONS.admissionRead,
    PERMISSIONS.admissionCreate,
  ],
  doctor: [
    PERMISSIONS.identitySelfRead,
    PERMISSIONS.identityPasswordChange,
    PERMISSIONS.patientRead,
    PERMISSIONS.doctorRead,
    PERMISSIONS.doctorScheduleRead,
    PERMISSIONS.medicalRecordRead,
    PERMISSIONS.medicalRecordCreate,
    PERMISSIONS.medicalRecordUpdate,
    PERMISSIONS.medicalRecordFinalize,
    PERMISSIONS.medicalRecordAmend,
    PERMISSIONS.prescriptionRead,
    PERMISSIONS.prescriptionCreate,
    PERMISSIONS.prescriptionCancel,
    PERMISSIONS.medicineRead,
    PERMISSIONS.labTestRead,
    PERMISSIONS.labRequestRead,
    PERMISSIONS.labRequestCreate,
  ],
  nurse: [
    PERMISSIONS.identitySelfRead,
    PERMISSIONS.identityPasswordChange,
    PERMISSIONS.patientRead,
    PERMISSIONS.medicalRecordRead,
    PERMISSIONS.prescriptionRead,
    PERMISSIONS.labRequestRead,
    PERMISSIONS.admissionRead,
  ],
  laboratory_staff: [
    PERMISSIONS.identitySelfRead,
    PERMISSIONS.identityPasswordChange,
    PERMISSIONS.labRequestRead,
    PERMISSIONS.labSampleCollect,
    PERMISSIONS.labResultEnter,
  ],
  pharmacist: [
    PERMISSIONS.identitySelfRead,
    PERMISSIONS.identityPasswordChange,
    PERMISSIONS.medicineRead,
    PERMISSIONS.inventoryRead,
    PERMISSIONS.stockReceive,
    PERMISSIONS.stockAdjust,
    PERMISSIONS.stockMovementRead,
    PERMISSIONS.prescriptionRead,
    PERMISSIONS.prescriptionDispense,
    PERMISSIONS.prescriptionReverse,
  ],
  accountant: [
    PERMISSIONS.identitySelfRead,
    PERMISSIONS.identityPasswordChange,
    PERMISSIONS.invoiceRead,
    PERMISSIONS.invoiceCreate,
    PERMISSIONS.invoiceUpdate,
    PERMISSIONS.invoiceIssue,
    PERMISSIONS.invoiceVoid,
    PERMISSIONS.paymentRead,
    PERMISSIONS.paymentCreate,
    PERMISSIONS.paymentReverse,
  ],
}

export async function syncApprovedRolePermissions(
  transaction: Prisma.TransactionClient,
): Promise<Map<string, string>> {
  const roleRows = new Map<string, string>()
  for (const [code, name, description] of SYSTEM_ROLES) {
    const role = await transaction.role.upsert({
      where: { code },
      create: {
        code,
        name,
        description,
        status: 'active',
        isSystem: true,
      },
      update: {
        name,
        description,
        status: 'active',
        isSystem: true,
        updatedAt: new Date(),
      },
    })
    roleRows.set(code, role.id)
  }

  const permissionIds = new Map<string, string>()
  for (const [code, description] of APPROVED_PERMISSIONS) {
    const permission = await transaction.permission.upsert({
      where: { code },
      create: { code, description },
      update: { description, updatedAt: new Date() },
    })
    permissionIds.set(code, permission.id)
  }

  for (const [roleCode, roleId] of roleRows) {
    const approvedCodes =
      ROLE_PERMISSION_CODES[roleCode as keyof typeof ROLE_PERMISSION_CODES]
    for (const permissionCode of approvedCodes) {
      const permissionId = permissionIds.get(permissionCode)!
      await transaction.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId, permissionId },
        },
        create: { roleId, permissionId },
        update: {},
      })
    }
    await transaction.rolePermission.deleteMany({
      where: {
        roleId,
        permission: {
          code: {
            in: APPROVED_PERMISSIONS
              .map(([code]) => code)
              .filter((code) => !approvedCodes.includes(code)),
          },
        },
      },
    })
  }

  return roleRows
}

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
  [PERMISSIONS.medicineRead, 'Read the active medicine catalog for prescribing.'],
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
  ],
  nurse: [
    PERMISSIONS.identitySelfRead,
    PERMISSIONS.identityPasswordChange,
    PERMISSIONS.patientRead,
    PERMISSIONS.medicalRecordRead,
    PERMISSIONS.prescriptionRead,
  ],
  laboratory_staff: [
    PERMISSIONS.identitySelfRead,
    PERMISSIONS.identityPasswordChange,
  ],
  pharmacist: [
    PERMISSIONS.identitySelfRead,
    PERMISSIONS.identityPasswordChange,
    PERMISSIONS.prescriptionRead,
  ],
  accountant: [
    PERMISSIONS.identitySelfRead,
    PERMISSIONS.identityPasswordChange,
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

import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PERMISSIONS } from '../../src/auth/auth.constants.js'
import { hashPassword } from '../../src/auth/password.service.js'
import { createApp } from '../../src/app.js'
import { database } from '../../src/database/database.service.js'

const prisma = new PrismaClient()
const app = createApp()
const prefix = `clin-${randomUUID().slice(0, 8)}`
const password = 'Valid password 42'
const roleIds: string[] = []
const userIds: string[] = []
const departmentIds: string[] = []
const employeeIds: string[] = []
const doctorIds: string[] = []
const patientIds: string[] = []
const appointmentIds: string[] = []
const admissionIds: string[] = []
const medicalRecordIds: string[] = []
const prescriptionIds: string[] = []
const medicineIds: string[] = []
const tokens = new Map<string, string>()
const userIdByRole = new Map<string, string>()

const clinicalPermissions = [
  PERMISSIONS.medicalRecordRead,
  PERMISSIONS.medicalRecordCreate,
  PERMISSIONS.medicalRecordUpdate,
  PERMISSIONS.medicalRecordFinalize,
  PERMISSIONS.medicalRecordAmend,
  PERMISSIONS.prescriptionRead,
  PERMISSIONS.prescriptionCreate,
  PERMISSIONS.prescriptionCancel,
  PERMISSIONS.medicineRead,
] as const

const roleMatrix = {
  administrator: [
    PERMISSIONS.medicalRecordRead,
    PERMISSIONS.prescriptionRead,
    PERMISSIONS.patientRead,
    PERMISSIONS.patientCreate,
    PERMISSIONS.departmentCreate,
    PERMISSIONS.employeeCreate,
    PERMISSIONS.employeeUpdate,
    PERMISSIONS.doctorCreate,
    PERMISSIONS.doctorUpdate,
  ],
  receptionist: [
    PERMISSIONS.patientRead,
    PERMISSIONS.patientCreate,
  ],
  doctor: [...clinicalPermissions, PERMISSIONS.patientRead],
  nurse: [
    PERMISSIONS.medicalRecordRead,
    PERMISSIONS.prescriptionRead,
    PERMISSIONS.patientRead,
  ],
  laboratory_staff: [],
  pharmacist: [PERMISSIONS.prescriptionRead, PERMISSIONS.medicineRead],
  accountant: [],
} as const

function assertSafeTestTarget(): void {
  if (process.env.HMS_DATABASE_TESTS !== 'true' || !process.env.DATABASE_URL) {
    throw new Error('Clinical database tests require the guarded database runner.')
  }
  const url = new URL(process.env.DATABASE_URL)
  if (
    !['localhost', '127.0.0.1', '::1'].includes(url.hostname) ||
    url.pathname.replace(/^\//, '') !== 'hms_test'
  ) {
    throw new Error('Refusing to run clinical tests outside local hms_test.')
  }
}

assertSafeTestTarget()

async function login(username: string): Promise<string> {
  const response = await request(app)
    .post('/api/v1/auth/login')
    .set({ Origin: 'http://localhost:5173', 'X-HMS-CSRF': '1' })
    .send({ username, password })
  expect(response.status, JSON.stringify(response.body)).toBe(200)
  return response.body.data.accessToken as string
}

function authorized(
  method: 'get' | 'post' | 'patch',
  path: string,
  role: string,
) {
  return request(app)[method](path).set(
    'Authorization',
    `Bearer ${tokens.get(role)}`,
  )
}

function trackRecord(response: { status: number; body: { data?: { id?: string } } }) {
  if (response.status === 201 || response.status === 200) {
    const id = response.body.data?.id
    if (id && !medicalRecordIds.includes(id)) medicalRecordIds.push(id)
  }
}

function trackPrescription(response: { status: number; body: { data?: { id?: string } } }) {
  if (response.status === 201 || response.status === 200) {
    const id = response.body.data?.id
    if (id && !prescriptionIds.includes(id)) prescriptionIds.push(id)
  }
}

async function createPatient(lastName: string): Promise<string> {
  const response = await authorized('post', '/api/v1/patients', 'administrator').send({
    firstName: 'Fictional',
    lastName,
    dateOfBirth: '1990-05-01',
    dateOfBirthPrecision: 'month',
    sexAtRegistration: 'unknown',
  })
  expect(response.status, JSON.stringify(response.body)).toBe(201)
  patientIds.push(response.body.data.id)
  return response.body.data.id as string
}

beforeAll(async () => {
  const permissionIds = new Map<string, string>()
  const codes = Object.values(PERMISSIONS).filter(
    (value) =>
      value.startsWith('medical_record.') ||
      value.startsWith('prescription.') ||
      value.startsWith('medicine.') ||
      value.startsWith('patient.') ||
      value.startsWith('department.') ||
      value.startsWith('employee.') ||
      value.startsWith('doctor.'),
  )
  for (const code of codes) {
    const permission = await prisma.permission.upsert({
      where: { code },
      create: { code, description: `Test permission ${code}` },
      update: {},
    })
    permissionIds.set(code, permission.id)
  }

  for (const [roleName, permissions] of Object.entries(roleMatrix)) {
    const role = await prisma.role.create({
      data: {
        code: `${prefix}-${roleName}`,
        name: `Clinical API ${roleName}`,
        isSystem: false,
      },
    })
    roleIds.push(role.id)
    for (const code of permissions) {
      await prisma.rolePermission.create({
        data: { roleId: role.id, permissionId: permissionIds.get(code)! },
      })
    }
    const user = await prisma.user.create({
      data: {
        username: `${prefix}-${roleName}`,
        passwordHash: await hashPassword(password),
        status: 'active',
        roles: { create: { roleId: role.id } },
      },
    })
    userIds.push(user.id)
    userIdByRole.set(roleName, user.id)
    tokens.set(roleName, await login(user.username))
  }
})

afterAll(async () => {
  await prisma.auditLog.deleteMany({
    where: {
      OR: [
        { actorUserId: { in: userIds } },
        { resourceId: { in: [...medicalRecordIds, ...prescriptionIds, ...patientIds, ...employeeIds] } },
      ],
    },
  })
  await prisma.refreshSession.deleteMany({ where: { userId: { in: userIds } } })
  await prisma.prescriptionItem.deleteMany({
    where: { prescriptionId: { in: prescriptionIds } },
  })
  await prisma.prescription.deleteMany({ where: { id: { in: prescriptionIds } } })
  await prisma.diagnosis.deleteMany({
    where: { medicalRecordId: { in: medicalRecordIds } },
  })
  await prisma.treatment.deleteMany({
    where: { medicalRecordId: { in: medicalRecordIds } },
  })
  await prisma.medicalReport.deleteMany({
    where: { medicalRecordId: { in: medicalRecordIds } },
  })
  await prisma.medicalRecord.deleteMany({
    where: {
      id: { in: medicalRecordIds },
      amendsMedicalRecordId: { not: null },
    },
  })
  await prisma.medicalRecord.deleteMany({ where: { id: { in: medicalRecordIds } } })
  await prisma.appointment.deleteMany({ where: { id: { in: appointmentIds } } })
  await prisma.admission.deleteMany({ where: { id: { in: admissionIds } } })
  await prisma.medicine.deleteMany({ where: { id: { in: medicineIds } } })
  await prisma.doctorProfile.deleteMany({ where: { id: { in: doctorIds } } })
  await prisma.employee.deleteMany({ where: { id: { in: employeeIds } } })
  await prisma.department.deleteMany({ where: { id: { in: departmentIds } } })
  await prisma.patient.deleteMany({ where: { id: { in: patientIds } } })
  await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } })
  await prisma.user.deleteMany({ where: { id: { in: userIds } } })
  await prisma.rolePermission.deleteMany({ where: { roleId: { in: roleIds } } })
  await prisma.role.deleteMany({ where: { id: { in: roleIds } } })
  await database.disconnect()
  await prisma.$disconnect()
})

describe('medical record authorization', () => {
  it.each([
    ['administrator', 200],
    ['doctor', 200],
    ['nurse', 200],
    ['receptionist', 403],
    ['laboratory_staff', 403],
    ['pharmacist', 403],
    ['accountant', 403],
  ])('enforces medical_record.read for %s', async (role, expected) => {
    expect((await authorized('get', '/api/v1/medical-records', role)).status).toBe(expected)
  })

  it('requires authentication', async () => {
    expect((await request(app).get('/api/v1/medical-records')).status).toBe(401)
  })
})

describe('medical record workflow', () => {
  let patientA = ''
  let patientB = ''
  let linkedEmployeeId = ''
  let linkedDoctorId = ''
  let departmentId = ''
  let appointmentId = ''
  let admissionId = ''
  let otherAdmissionId = ''
  let activeMedicineId = ''
  let inactiveMedicineId = ''

  beforeAll(async () => {
    patientA = await createPatient(`Alpha${prefix.slice(-4)}`)
    patientB = await createPatient(`Beta${prefix.slice(-4)}`)

    const department = await authorized('post', '/api/v1/departments', 'administrator').send({
      code: `${prefix}-dep`.slice(0, 30),
      name: `${prefix} clinical`,
    })
    expect(department.status).toBe(201)
    departmentId = department.body.data.id
    departmentIds.push(departmentId)

    const employee = await authorized('post', '/api/v1/employees', 'administrator').send({
      firstName: 'Fictional',
      lastName: 'Clinician',
      jobTitle: 'Physician',
      departmentId,
      hireDate: '2020-01-15',
      userId: userIdByRole.get('doctor'),
    })
    expect(employee.status, JSON.stringify(employee.body)).toBe(201)
    linkedEmployeeId = employee.body.data.id
    employeeIds.push(linkedEmployeeId)

    const doctor = await authorized('post', '/api/v1/doctors', 'administrator').send({
      employeeId: linkedEmployeeId,
      licenseNumber: `LIC-${prefix}`,
      specialization: 'General',
    })
    expect(doctor.status, JSON.stringify(doctor.body)).toBe(201)
    linkedDoctorId = doctor.body.data.id
    doctorIds.push(linkedDoctorId)

    const appointment = await prisma.appointment.create({
      data: {
        patientId: patientA,
        doctorId: linkedDoctorId,
        startsAt: new Date('2030-03-01T10:00:00.000Z'),
        endsAt: new Date('2030-03-01T11:00:00.000Z'),
        status: 'completed',
        createdByUserId: userIdByRole.get('administrator')!,
      },
    })
    appointmentId = appointment.id
    appointmentIds.push(appointmentId)

    const admission = await prisma.admission.create({
      data: {
        admissionNumber: `ADM-${prefix}-a`,
        patientId: patientA,
        admittedAt: new Date('2030-03-02T08:00:00.000Z'),
        status: 'admitted',
        reason: 'Fictional observation',
        createdByUserId: userIdByRole.get('administrator')!,
      },
    })
    admissionId = admission.id
    admissionIds.push(admissionId)

    const otherAdmission = await prisma.admission.create({
      data: {
        admissionNumber: `ADM-${prefix}-b`,
        patientId: patientB,
        admittedAt: new Date('2030-03-02T08:00:00.000Z'),
        status: 'admitted',
        reason: 'Fictional other patient',
        createdByUserId: userIdByRole.get('administrator')!,
      },
    })
    otherAdmissionId = otherAdmission.id
    admissionIds.push(otherAdmissionId)

    const active = await prisma.medicine.create({
      data: {
        code: `MED-${prefix}-A`,
        genericName: 'Fictionalcillin',
        dosageForm: 'tablet',
        inventoryUnit: 'tablet',
        currency: 'USD',
        status: 'active',
      },
    })
    activeMedicineId = active.id
    medicineIds.push(active.id)

    const inactive = await prisma.medicine.create({
      data: {
        code: `MED-${prefix}-I`,
        genericName: 'Inactivecillin',
        dosageForm: 'tablet',
        inventoryUnit: 'tablet',
        currency: 'USD',
        status: 'inactive',
      },
    })
    inactiveMedicineId = inactive.id
    medicineIds.push(inactive.id)
  })

  it('rejects unlinked doctor clinical writes and client-supplied author', async () => {
    const unlinked = await prisma.user.create({
      data: {
        username: `${prefix}-unlinked`,
        passwordHash: await hashPassword(password),
        status: 'active',
        roles: {
          create: {
            roleId: roleIds[Object.keys(roleMatrix).indexOf('doctor')]!,
          },
        },
      },
    })
    userIds.push(unlinked.id)
    const unlinkedToken = await login(unlinked.username)
    const response = await request(app)
      .post('/api/v1/medical-records')
      .set('Authorization', `Bearer ${unlinkedToken}`)
      .send({
        patientId: patientA,
        occurredAt: '2030-03-01T12:00:00.000Z',
        authorEmployeeId: linkedEmployeeId,
      })
    expect(response.status).toBe(400)

    const missingLink = await request(app)
      .post('/api/v1/medical-records')
      .set('Authorization', `Bearer ${unlinkedToken}`)
      .send({
        patientId: patientA,
        occurredAt: '2030-03-01T12:00:00.000Z',
      })
    expect(missingLink.status).toBe(409)
  })

  it('rejects unauthorized roles from creating medical records', async () => {
    expect(
      (await authorized('post', '/api/v1/medical-records', 'administrator').send({
        patientId: patientA,
        occurredAt: '2030-03-01T12:00:00.000Z',
      })).status,
    ).toBe(403)
    expect(
      (await authorized('post', '/api/v1/medical-records', 'nurse').send({
        patientId: patientA,
        occurredAt: '2030-03-01T12:00:00.000Z',
      })).status,
    ).toBe(403)
    expect(
      (await authorized('post', '/api/v1/medical-records', 'receptionist').send({
        patientId: patientA,
        occurredAt: '2030-03-01T12:00:00.000Z',
      })).status,
    ).toBe(403)
  })

  it('creates and edits a draft, replacing clinical children', async () => {
    const created = await authorized('post', '/api/v1/medical-records', 'doctor').send({
      patientId: patientA,
      occurredAt: '2030-03-01T12:00:00.000Z',
      diagnoses: [{ diagnosisText: 'Fictional fever' }],
    })
    trackRecord(created)
    expect(created.status, JSON.stringify(created.body)).toBe(201)
    expect(created.body.data.status).toBe('draft')
    expect(created.body.data.authorEmployeeId).toBe(linkedEmployeeId)
    expect(created.body.data.finalizedAt).toBeNull()

    const updated = await authorized(
      'patch',
      `/api/v1/medical-records/${created.body.data.id}`,
      'doctor',
    ).send({
      occurredAt: '2030-03-01T13:00:00.000Z',
      treatments: [{ treatmentText: 'Rest' }],
      reports: [{ title: 'Note', reportText: 'Observed improvement.' }],
      diagnoses: [{ diagnosisText: 'Revised fever' }],
    })
    expect(updated.status, JSON.stringify(updated.body)).toBe(200)
    expect(updated.body.data.diagnoses).toHaveLength(1)
    expect(updated.body.data.diagnoses[0].diagnosisText).toBe('Revised fever')
    expect(updated.body.data.treatments[0].treatmentText).toBe('Rest')
    expect(updated.body.data.patientId).toBe(patientA)
    expect(updated.body.data.authorEmployeeId).toBe(linkedEmployeeId)
  })

  it('keeps patient and author immutable on draft patch', async () => {
    const created = await authorized('post', '/api/v1/medical-records', 'doctor').send({
      patientId: patientA,
      occurredAt: '2030-03-01T14:00:00.000Z',
    })
    trackRecord(created)
    expect(
      (await authorized(
        'patch',
        `/api/v1/medical-records/${created.body.data.id}`,
        'doctor',
      ).send({ patientId: patientB })).status,
    ).toBe(400)
  })

  it('accepts appointment, admission, or neither and rejects patient mismatch', async () => {
    const neither = await authorized('post', '/api/v1/medical-records', 'doctor').send({
      patientId: patientA,
      occurredAt: '2030-03-01T15:00:00.000Z',
    })
    trackRecord(neither)
    expect(neither.status).toBe(201)
    expect(neither.body.data.appointmentId).toBeNull()
    expect(neither.body.data.admissionId).toBeNull()

    const withAppointment = await authorized('post', '/api/v1/medical-records', 'doctor').send({
      patientId: patientA,
      occurredAt: '2030-03-01T16:00:00.000Z',
      appointmentId,
    })
    trackRecord(withAppointment)
    expect(withAppointment.status).toBe(201)
    expect(withAppointment.body.data.appointmentId).toBe(appointmentId)

    const withAdmission = await authorized('post', '/api/v1/medical-records', 'doctor').send({
      patientId: patientA,
      occurredAt: '2030-03-01T17:00:00.000Z',
      admissionId,
    })
    trackRecord(withAdmission)
    expect(withAdmission.status).toBe(201)

    const mismatch = await authorized('post', '/api/v1/medical-records', 'doctor').send({
      patientId: patientA,
      occurredAt: '2030-03-01T18:00:00.000Z',
      admissionId: otherAdmissionId,
    })
    expect(mismatch.status).toBe(409)
  })

  it('finalizes only non-empty drafts and sets finalizedAt server-side', async () => {
    const empty = await authorized('post', '/api/v1/medical-records', 'doctor').send({
      patientId: patientA,
      occurredAt: '2030-03-04T10:00:00.000Z',
    })
    trackRecord(empty)
    expect(
      (await authorized(
        'post',
        `/api/v1/medical-records/${empty.body.data.id}/finalize`,
        'doctor',
      ).send()).status,
    ).toBe(409)

    const diagnosisOnly = await authorized('post', '/api/v1/medical-records', 'doctor').send({
      patientId: patientA,
      occurredAt: '2030-03-04T11:00:00.000Z',
      diagnoses: [{ diagnosisText: 'Enough' }],
    })
    trackRecord(diagnosisOnly)
    const finalizedDiagnosis = await authorized(
      'post',
      `/api/v1/medical-records/${diagnosisOnly.body.data.id}/finalize`,
      'doctor',
    ).send()
    expect(finalizedDiagnosis.status).toBe(200)
    expect(finalizedDiagnosis.body.data.status).toBe('final')
    expect(finalizedDiagnosis.body.data.finalizedAt).toBeTruthy()

    const treatmentOnly = await authorized('post', '/api/v1/medical-records', 'doctor').send({
      patientId: patientA,
      occurredAt: '2030-03-04T12:00:00.000Z',
      treatments: [{ treatmentText: 'Enough' }],
    })
    trackRecord(treatmentOnly)
    expect(
      (await authorized(
        'post',
        `/api/v1/medical-records/${treatmentOnly.body.data.id}/finalize`,
        'doctor',
      ).send()).status,
    ).toBe(200)

    const reportOnly = await authorized('post', '/api/v1/medical-records', 'doctor').send({
      patientId: patientA,
      occurredAt: '2030-03-04T13:00:00.000Z',
      reports: [{ title: 'Report', reportText: 'Enough' }],
    })
    trackRecord(reportOnly)
    expect(
      (await authorized(
        'post',
        `/api/v1/medical-records/${reportOnly.body.data.id}/finalize`,
        'doctor',
      ).send()).status,
    ).toBe(200)
  })

  it('rejects edits after finalization', async () => {
    const created = await authorized('post', '/api/v1/medical-records', 'doctor').send({
      patientId: patientA,
      occurredAt: '2030-03-05T10:00:00.000Z',
      diagnoses: [{ diagnosisText: 'Locked' }],
    })
    trackRecord(created)
    await authorized(
      'post',
      `/api/v1/medical-records/${created.body.data.id}/finalize`,
      'doctor',
    ).send()
    expect(
      (await authorized(
        'patch',
        `/api/v1/medical-records/${created.body.data.id}`,
        'doctor',
      ).send({ diagnoses: [{ diagnosisText: 'Overwrite' }] })).status,
    ).toBe(409)
  })

  it('amends a final record, preserves predecessor content, and allows a chain', async () => {
    const original = await authorized('post', '/api/v1/medical-records', 'doctor').send({
      patientId: patientA,
      occurredAt: '2030-03-06T10:00:00.000Z',
      diagnoses: [{ diagnosisText: 'Original diagnosis' }],
    })
    trackRecord(original)
    const finalized = await authorized(
      'post',
      `/api/v1/medical-records/${original.body.data.id}/finalize`,
      'doctor',
    ).send()
    expect(finalized.status).toBe(200)

    const firstAmendment = await authorized(
      'post',
      `/api/v1/medical-records/${original.body.data.id}/amend`,
      'doctor',
    ).send({
      occurredAt: '2030-03-06T12:00:00.000Z',
      reason: 'Clarify diagnosis',
      diagnoses: [{ diagnosisText: 'Amended diagnosis' }],
    })
    trackRecord(firstAmendment)
    expect(firstAmendment.status, JSON.stringify(firstAmendment.body)).toBe(201)
    expect(firstAmendment.body.data.status).toBe('final')
    expect(firstAmendment.body.data.amendsMedicalRecordId).toBe(original.body.data.id)
    expect(firstAmendment.body.data.patientId).toBe(patientA)

    const predecessor = await authorized(
      'get',
      `/api/v1/medical-records/${original.body.data.id}`,
      'doctor',
    )
    expect(predecessor.body.data.status).toBe('amended')
    expect(predecessor.body.data.diagnoses[0].diagnosisText).toBe('Original diagnosis')
    expect(
      (await authorized(
        'patch',
        `/api/v1/medical-records/${original.body.data.id}`,
        'doctor',
      ).send({ diagnoses: [{ diagnosisText: 'Tamper' }] })).status,
    ).toBe(409)

    expect(
      (await authorized(
        'post',
        `/api/v1/medical-records/${original.body.data.id}/amend`,
        'doctor',
      ).send({
        occurredAt: '2030-03-06T13:00:00.000Z',
        reason: 'Duplicate',
        diagnoses: [{ diagnosisText: 'Second try' }],
      })).status,
    ).toBe(409)

    expect(
      (await authorized(
        'post',
        `/api/v1/medical-records/${original.body.data.id}/amend`,
        'doctor',
      ).send({
        occurredAt: '2030-03-06T09:00:00.000Z',
        reason: 'Earlier',
        diagnoses: [{ diagnosisText: 'Too early' }],
      })).status,
    ).toBe(409)

    const second = await authorized(
      'post',
      `/api/v1/medical-records/${firstAmendment.body.data.id}/amend`,
      'doctor',
    ).send({
      occurredAt: '2030-03-06T14:00:00.000Z',
      reason: 'Further clarification',
      treatments: [{ treatmentText: 'Updated plan' }],
    })
    trackRecord(second)
    expect(second.status, JSON.stringify(second.body)).toBe(201)
    expect(second.body.data.amendsMedicalRecordId).toBe(firstAmendment.body.data.id)
  })

  it('rejects prescription creation from drafts and inactive medicines', async () => {
    const draft = await authorized('post', '/api/v1/medical-records', 'doctor').send({
      patientId: patientA,
      occurredAt: '2030-03-07T10:00:00.000Z',
      diagnoses: [{ diagnosisText: 'Draft still' }],
    })
    trackRecord(draft)
    expect(
      (await authorized('post', '/api/v1/prescriptions', 'doctor').send({
        medicalRecordId: draft.body.data.id,
        items: [{
          medicineId: activeMedicineId,
          dosage: '1 tablet',
          frequency: 'daily',
          duration: '3 days',
          quantityPrescribed: '3',
          unit: 'tablet',
        }],
      })).status,
    ).toBe(409)

    const finalizable = await authorized('post', '/api/v1/medical-records', 'doctor').send({
      patientId: patientA,
      occurredAt: '2030-03-07T11:00:00.000Z',
      diagnoses: [{ diagnosisText: 'Ready' }],
    })
    trackRecord(finalizable)
    await authorized(
      'post',
      `/api/v1/medical-records/${finalizable.body.data.id}/finalize`,
      'doctor',
    ).send()

    expect(
      (await authorized('post', '/api/v1/prescriptions', 'doctor').send({
        medicalRecordId: finalizable.body.data.id,
        prescribedByDoctorId: linkedDoctorId,
        items: [{
          medicineId: activeMedicineId,
          dosage: '1 tablet',
          frequency: 'daily',
          duration: '3 days',
          quantityPrescribed: '3',
          unit: 'tablet',
        }],
      })).status,
    ).toBe(400)

    expect(
      (await authorized('post', '/api/v1/prescriptions', 'doctor').send({
        medicalRecordId: finalizable.body.data.id,
        items: [{
          medicineId: inactiveMedicineId,
          dosage: '1 tablet',
          frequency: 'daily',
          duration: '3 days',
          quantityPrescribed: '3',
          unit: 'tablet',
        }],
      })).status,
    ).toBe(409)

    expect(
      (await authorized('post', '/api/v1/prescriptions', 'doctor').send({
        medicalRecordId: finalizable.body.data.id,
        items: [{
          medicineId: activeMedicineId,
          dosage: '1 tablet',
          frequency: 'daily',
          duration: '3 days',
          quantityPrescribed: '3',
          unit: 'capsule',
        }],
      })).status,
    ).toBe(400)

    const created = await authorized('post', '/api/v1/prescriptions', 'doctor').send({
      medicalRecordId: finalizable.body.data.id,
      items: [{
        medicineId: activeMedicineId,
        dosage: '1 tablet',
        frequency: 'daily',
        duration: '3 days',
        quantityPrescribed: '3',
        unit: 'tablet',
      }],
    })
    trackPrescription(created)
    expect(created.status, JSON.stringify(created.body)).toBe(201)
    expect(created.body.data.status).toBe('active')
    expect(created.body.data.patientId).toBe(patientA)
    expect(created.body.data.prescribedByDoctorId).toBe(linkedDoctorId)
    expect(created.body.data.items).toHaveLength(1)

    expect((await authorized('patch', `/api/v1/prescriptions/${created.body.data.id}`, 'doctor').send({
      items: [],
    })).status).toBe(404)

    const cancelled = await authorized(
      'post',
      `/api/v1/prescriptions/${created.body.data.id}/cancel`,
      'doctor',
    ).send({ cancellationReason: 'Entered in error' })
    expect(cancelled.status).toBe(200)
    expect(cancelled.body.data.status).toBe('cancelled')
    expect(
      (await authorized(
        'post',
        `/api/v1/prescriptions/${created.body.data.id}/cancel`,
        'doctor',
      ).send({ cancellationReason: 'Again' })).status,
    ).toBe(409)
  })

  it('does not cancel dispensed or partially dispensed prescriptions', async () => {
    const record = await authorized('post', '/api/v1/medical-records', 'doctor').send({
      patientId: patientA,
      occurredAt: '2030-03-08T10:00:00.000Z',
      diagnoses: [{ diagnosisText: 'Dispense state' }],
    })
    trackRecord(record)
    await authorized(
      'post',
      `/api/v1/medical-records/${record.body.data.id}/finalize`,
      'doctor',
    ).send()
    const created = await authorized('post', '/api/v1/prescriptions', 'doctor').send({
      medicalRecordId: record.body.data.id,
      items: [{
        medicineId: activeMedicineId,
        dosage: '1 tablet',
        frequency: 'daily',
        duration: '3 days',
        quantityPrescribed: '3',
        unit: 'tablet',
      }],
    })
    trackPrescription(created)
    await prisma.prescription.update({
      where: { id: created.body.data.id },
      data: { status: 'dispensed' },
    })
    expect(
      (await authorized(
        'post',
        `/api/v1/prescriptions/${created.body.data.id}/cancel`,
        'doctor',
      ).send({ cancellationReason: 'Too late' })).status,
    ).toBe(409)
  })

  it('lists only active medicines and hides the catalog from non-prescribers', async () => {
    const doctorList = await authorized('get', '/api/v1/medicines', 'doctor')
    expect(doctorList.status).toBe(200)
    const codes = doctorList.body.data.map((row: { code: string }) => row.code)
    expect(codes).toContain(`MED-${prefix}-A`)
    expect(codes).not.toContain(`MED-${prefix}-I`)
    expect((await authorized('get', '/api/v1/medicines', 'pharmacist')).status).toBe(200)
    expect((await authorized('get', '/api/v1/medicines', 'administrator')).status).toBe(403)
  })

  it('enforces prescription.read independently of patient.read', async () => {
    expect((await authorized('get', '/api/v1/prescriptions', 'pharmacist')).status).toBe(200)
    expect((await authorized('get', '/api/v1/prescriptions', 'receptionist')).status).toBe(403)
    expect((await authorized('get', '/api/v1/prescriptions', 'accountant')).status).toBe(403)
    expect((await authorized('post', '/api/v1/prescriptions', 'pharmacist').send({
      medicalRecordId: randomUUID(),
      items: [{
        medicineId: activeMedicineId,
        dosage: '1',
        frequency: 'daily',
        duration: '1 day',
        quantityPrescribed: '1',
        unit: 'tablet',
      }],
    })).status).toBe(403)
  })

  it('rejects prescribing when the doctor profile or employee is inactive', async () => {
    const record = await authorized('post', '/api/v1/medical-records', 'doctor').send({
      patientId: patientA,
      occurredAt: '2030-03-09T10:00:00.000Z',
      diagnoses: [{ diagnosisText: 'Identity check' }],
    })
    trackRecord(record)
    await authorized(
      'post',
      `/api/v1/medical-records/${record.body.data.id}/finalize`,
      'doctor',
    ).send()

    const payload = {
      medicalRecordId: record.body.data.id,
      items: [{
        medicineId: activeMedicineId,
        dosage: '1 tablet',
        frequency: 'daily',
        duration: '3 days',
        quantityPrescribed: '3',
        unit: 'tablet',
      }],
    }

    await prisma.doctorProfile.update({
      where: { id: linkedDoctorId },
      data: { status: 'inactive' },
    })
    expect((await authorized('post', '/api/v1/prescriptions', 'doctor').send(payload)).status).toBe(409)

    await prisma.doctorProfile.update({
      where: { id: linkedDoctorId },
      data: { status: 'active' },
    })
    await prisma.employee.update({
      where: { id: linkedEmployeeId },
      data: { employmentStatus: 'inactive' },
    })
    expect((await authorized('post', '/api/v1/prescriptions', 'doctor').send(payload)).status).toBe(409)

    await prisma.employee.update({
      where: { id: linkedEmployeeId },
      data: { employmentStatus: 'active' },
    })
  })
})

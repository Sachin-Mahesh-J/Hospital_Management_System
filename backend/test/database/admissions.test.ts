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
const prefix = `adm-api-${randomUUID().slice(0, 8)}`
const password = 'Valid password 42'
const roleIds: string[] = []
const userIds: string[] = []
const departmentIds: string[] = []
const employeeIds: string[] = []
const doctorIds: string[] = []
const patientIds: string[] = []
const admissionIds: string[] = []
const tokens = new Map<string, string>()

const roleMatrix = {
  administrator: [
    PERMISSIONS.patientRead,
    PERMISSIONS.patientCreate,
    PERMISSIONS.patientUpdate,
    PERMISSIONS.departmentCreate,
    PERMISSIONS.employeeCreate,
    PERMISSIONS.employeeUpdate,
    PERMISSIONS.doctorCreate,
    PERMISSIONS.doctorUpdate,
  ],
  receptionist: [
    PERMISSIONS.admissionRead,
    PERMISSIONS.admissionCreate,
    PERMISSIONS.patientRead,
    PERMISSIONS.patientCreate,
    PERMISSIONS.patientUpdate,
    PERMISSIONS.doctorRead,
  ],
  nurse: [PERMISSIONS.admissionRead, PERMISSIONS.patientRead],
  doctor: [],
  laboratory_staff: [],
  pharmacist: [],
  accountant: [],
  operator: [
    PERMISSIONS.admissionRead,
    PERMISSIONS.admissionUpdate,
    PERMISSIONS.admissionDischarge,
    PERMISSIONS.admissionCancel,
  ],
} as const

function assertSafeTestTarget(): void {
  if (process.env.HMS_DATABASE_TESTS !== 'true' || !process.env.DATABASE_URL) {
    throw new Error('Admission database tests require the guarded database runner.')
  }
  const url = new URL(process.env.DATABASE_URL)
  if (
    !['localhost', '127.0.0.1', '::1'].includes(url.hostname) ||
    url.pathname.replace(/^\//, '') !== 'hms_test'
  ) {
    throw new Error('Refusing to run admission tests outside local hms_test.')
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

function trackAdmission(response: { status: number; body: { data?: { id?: string } } }) {
  if (response.status === 201 || response.status === 200) {
    const id = response.body.data?.id
    if (id && !admissionIds.includes(id)) admissionIds.push(id)
  }
}

async function createPatient(lastName: string, status?: 'active' | 'inactive' | 'deceased') {
  const response = await authorized('post', '/api/v1/patients', 'administrator').send({
    firstName: 'Fictional',
    lastName,
    dateOfBirth: '1990-05-01',
    dateOfBirthPrecision: 'month',
    sexAtRegistration: 'unknown',
  })
  expect(response.status, JSON.stringify(response.body)).toBe(201)
  patientIds.push(response.body.data.id)
  if (status && status !== 'active') {
    const updated = await authorized(
      'patch',
      `/api/v1/patients/${response.body.data.id}`,
      'administrator',
    ).send({ status })
    expect(updated.status, JSON.stringify(updated.body)).toBe(200)
  }
  return response.body.data.id as string
}

async function createDoctorFixture(options?: {
  status?: 'active' | 'inactive'
  employmentStatus?: 'active' | 'inactive' | 'terminated'
}): Promise<{ doctorId: string; employeeId: string }> {
  const suffix = randomUUID().slice(0, 8)
  const department = await authorized('post', '/api/v1/departments', 'administrator').send({
    code: `${prefix}-${suffix}`.slice(0, 30),
    name: `${prefix} ${suffix}`,
  })
  expect(department.status).toBe(201)
  departmentIds.push(department.body.data.id)

  const employee = await authorized('post', '/api/v1/employees', 'administrator').send({
    firstName: 'Fictional',
    lastName: `Doctor${suffix}`,
    jobTitle: 'Physician',
    departmentId: department.body.data.id,
    hireDate: '2020-01-15',
    employmentStatus: options?.employmentStatus ?? 'active',
  })
  expect(employee.status, JSON.stringify(employee.body)).toBe(201)
  employeeIds.push(employee.body.data.id)

  const doctor = await authorized('post', '/api/v1/doctors', 'administrator').send({
    employeeId: employee.body.data.id,
    licenseNumber: `ADM-LIC-${suffix}`,
    specialization: 'General',
    status: options?.status ?? 'active',
  })
  expect(doctor.status, JSON.stringify(doctor.body)).toBe(201)
  doctorIds.push(doctor.body.data.id)
  return {
    doctorId: doctor.body.data.id as string,
    employeeId: employee.body.data.id as string,
  }
}

async function createAdmission(patientId: string, extras?: Record<string, unknown>) {
  const response = await authorized('post', '/api/v1/admissions', 'receptionist').send({
    patientId,
    reason: 'Fictional observation',
    ...extras,
  })
  trackAdmission(response)
  return response
}

beforeAll(async () => {
  const permissionIds = new Map<string, string>()
  const codes = Object.values(PERMISSIONS).filter(
    (value) =>
      value.startsWith('admission.') ||
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
        name: `Admission API ${roleName}`,
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
    tokens.set(roleName, await login(user.username))
  }
})

afterAll(async () => {
  await prisma.auditLog.deleteMany({
    where: {
      OR: [
        { actorUserId: { in: userIds } },
        { resourceId: { in: [...admissionIds, ...patientIds, ...doctorIds, ...employeeIds, ...departmentIds] } },
      ],
    },
  })
  await prisma.refreshSession.deleteMany({ where: { userId: { in: userIds } } })
  await prisma.admission.deleteMany({ where: { id: { in: admissionIds } } })
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

describe('admission authorization', () => {
  it.each([
    ['administrator', 403],
    ['receptionist', 200],
    ['nurse', 200],
    ['doctor', 403],
    ['laboratory_staff', 403],
    ['pharmacist', 403],
    ['accountant', 403],
  ])('enforces admission.read for %s', async (role, expected) => {
    expect((await authorized('get', '/api/v1/admissions', role)).status).toBe(expected)
  })

  it('requires authentication', async () => {
    expect((await request(app).get('/api/v1/admissions')).status).toBe(401)
    expect((await request(app).post('/api/v1/admissions').send({})).status).toBe(401)
  })
})

describe('admission creation and eligibility', () => {
  let activePatient = ''
  let inactivePatient = ''
  let deceasedPatient = ''
  let activeDoctor = ''
  let inactiveDoctor = ''
  let terminatedDoctor = ''

  beforeAll(async () => {
    activePatient = await createPatient('ActiveAdmit')
    inactivePatient = await createPatient('InactiveAdmit', 'inactive')
    deceasedPatient = await createPatient('DeceasedAdmit', 'deceased')
    activeDoctor = (await createDoctorFixture()).doctorId
    inactiveDoctor = (await createDoctorFixture({ status: 'inactive' })).doctorId
    terminatedDoctor = (await createDoctorFixture({
      employmentStatus: 'terminated',
    })).doctorId
  })

  it('lets a receptionist create an admission with a server-generated number and admitted status', async () => {
    const created = await createAdmission(activePatient, {
      attendingDoctorId: activeDoctor,
    })
    expect(created.status, JSON.stringify(created.body)).toBe(201)
    expect(created.body.data.admissionNumber).toMatch(
      /^ADM-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    )
    expect(created.body.data.status).toBe('admitted')
    expect(created.body.data.patientId).toBe(activePatient)
    expect(created.body.data.attendingDoctorId).toBe(activeDoctor)
    expect(created.body.data.reason).toBe('Fictional observation')
    expect(created.body.data.createdByUserId).toBeDefined()
    expect(created.body.data.admittedAt).toBeDefined()
    expect(created.body.data.dischargedAt).toBeNull()
    expect(created.body.data.patient.phone).toBeUndefined()
    expect(created.body.data.patient.email).toBeUndefined()
  })

  it('rejects client-controlled admission number, status, timestamps, and creator', async () => {
    const patient = await createPatient('MassAssign')
    const response = await createAdmission(patient, {
      admissionNumber: 'ADM-client-supplied',
      status: 'discharged',
      admittedAt: '2020-01-01T00:00:00.000Z',
      createdByUserId: randomUUID(),
      dischargedAt: '2020-01-02T00:00:00.000Z',
      dischargeSummary: 'Nope',
    })
    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
    expect(JSON.stringify(response.body)).not.toMatch(/SQL|prisma|stack/i)
  })

  it('rejects a blank reason', async () => {
    const patient = await createPatient('BlankReason')
    const response = await createAdmission(patient, { reason: '   ' })
    expect(response.status).toBe(400)
  })

  it('returns 404 for a missing patient and doctor', async () => {
    expect(
      (await createAdmission(randomUUID())).status,
    ).toBe(404)
    const patient = await createPatient('MissingDoctor')
    expect(
      (await createAdmission(patient, { attendingDoctorId: randomUUID() })).status,
    ).toBe(404)
  })

  it('rejects a deceased patient and accepts inactive patients', async () => {
    expect((await createAdmission(deceasedPatient)).status).toBe(409)
    const inactive = await createAdmission(inactivePatient)
    expect(inactive.status, JSON.stringify(inactive.body)).toBe(201)
  })

  it('rejects inactive doctors, terminated employees, and a second active admission', async () => {
    const forInactive = await createPatient('InactiveDoc')
    expect(
      (await createAdmission(forInactive, { attendingDoctorId: inactiveDoctor })).status,
    ).toBe(409)
    const forTerminated = await createPatient('TerminatedDoc')
    expect(
      (await createAdmission(forTerminated, { attendingDoctorId: terminatedDoctor })).status,
    ).toBe(409)

    const conflictPatient = await createPatient('OneActive')
    const first = await createAdmission(conflictPatient)
    expect(first.status).toBe(201)
    const second = await createAdmission(conflictPatient)
    expect(second.status).toBe(409)
    expect(second.body.error.message).toMatch(/active admission/i)
  })

  it('rejects concurrent active admissions for the same patient with a conflict', async () => {
    const patient = await createPatient('Concurrent')
    const [first, second] = await Promise.all([
      createAdmission(patient, { reason: 'First concurrent' }),
      createAdmission(patient, { reason: 'Second concurrent' }),
    ])
    const statuses = [first.status, second.status].sort()
    expect(statuses).toEqual([201, 409])
  })

  it('denies create for roles without admission.create', async () => {
    const patient = await createPatient('DeniedCreate')
    for (const role of ['administrator', 'nurse', 'doctor', 'laboratory_staff', 'pharmacist', 'accountant']) {
      expect(
        (
          await authorized('post', '/api/v1/admissions', role).send({
            patientId: patient,
            reason: 'Should fail',
          })
        ).status,
      ).toBe(403)
    }
  })

  it('lets nurse and receptionist read an admission and records a create audit event', async () => {
    const patient = await createPatient('Readable')
    const created = await createAdmission(patient)
    expect(created.status).toBe(201)
    expect(
      (await authorized('get', `/api/v1/admissions/${created.body.data.id}`, 'nurse')).status,
    ).toBe(200)
    expect(
      (await authorized('get', `/api/v1/admissions/${created.body.data.id}`, 'receptionist')).status,
    ).toBe(200)
    expect(
      (await authorized('get', `/api/v1/admissions/${created.body.data.id}`, 'administrator')).status,
    ).toBe(403)

    const audit = await prisma.auditLog.findFirst({
      where: {
        action: 'admission.create',
        resourceId: created.body.data.id,
      },
    })
    expect(audit).toBeTruthy()
    const metadata = audit!.metadata as Record<string, unknown>
    expect(metadata.admissionNumber).toBe(created.body.data.admissionNumber)
    expect(metadata).not.toHaveProperty('reason')
    expect(JSON.stringify(metadata)).not.toMatch(/password|token/i)
  })
})

describe('admission update, discharge, and cancel', () => {
  it('updates attending doctor and reason only while admitted', async () => {
    const patient = await createPatient('Updatable')
    const doctor = (await createDoctorFixture()).doctorId
    const created = await createAdmission(patient)
    expect(created.status).toBe(201)
    const id = created.body.data.id as string

    expect(
      (
        await authorized('patch', `/api/v1/admissions/${id}`, 'receptionist').send({
          reason: 'Updated by receptionist',
        })
      ).status,
    ).toBe(403)

    const updated = await authorized('patch', `/api/v1/admissions/${id}`, 'operator').send({
      attendingDoctorId: doctor,
      reason: 'Updated observation',
    })
    expect(updated.status, JSON.stringify(updated.body)).toBe(200)
    expect(updated.body.data.reason).toBe('Updated observation')
    expect(updated.body.data.attendingDoctorId).toBe(doctor)
    expect(updated.body.data.status).toBe('admitted')
    expect(updated.body.data.admissionNumber).toBe(created.body.data.admissionNumber)

    const audit = await prisma.auditLog.findFirst({
      where: { action: 'admission.update', resourceId: id },
    })
    expect(audit).toBeTruthy()
    expect(audit!.metadata).toMatchObject({
      fields: ['attendingDoctorId', 'reason'],
    })
  })

  it('discharges with a server timestamp and rejects a repeat discharge or later cancel', async () => {
    const patient = await createPatient('Dischargeable')
    const created = await createAdmission(patient)
    const id = created.body.data.id as string
    const before = Date.parse(created.body.data.admittedAt)

    expect(
      (
        await authorized('post', `/api/v1/admissions/${id}/discharge`, 'receptionist').send({
          dischargeSummary: 'Recovered',
        })
      ).status,
    ).toBe(403)

    const blank = await authorized(
      'post',
      `/api/v1/admissions/${id}/discharge`,
      'operator',
    ).send({ dischargeSummary: '  ' })
    expect(blank.status).toBe(400)

    const discharged = await authorized(
      'post',
      `/api/v1/admissions/${id}/discharge`,
      'operator',
    ).send({ dischargeSummary: 'Recovered after observation' })
    expect(discharged.status, JSON.stringify(discharged.body)).toBe(200)
    expect(discharged.body.data.status).toBe('discharged')
    expect(discharged.body.data.dischargeSummary).toBe('Recovered after observation')
    expect(Date.parse(discharged.body.data.dischargedAt)).toBeGreaterThanOrEqual(before)
    expect(discharged.body.data.reason).toBe('Fictional observation')

    const dischargeAudit = await prisma.auditLog.findFirst({
      where: { action: 'admission.discharge', resourceId: id },
    })
    expect(dischargeAudit).toBeTruthy()
    expect(JSON.stringify(dischargeAudit!.metadata)).not.toContain('Recovered after observation')

    expect(
      (
        await authorized('post', `/api/v1/admissions/${id}/discharge`, 'operator').send({
          dischargeSummary: 'Again',
        })
      ).status,
    ).toBe(409)
    expect(
      (
        await authorized('post', `/api/v1/admissions/${id}/cancel`, 'operator').send({
          reason: 'Too late',
        })
      ).status,
    ).toBe(409)
    expect(
      (
        await authorized('patch', `/api/v1/admissions/${id}`, 'operator').send({
          reason: 'No longer editable',
        })
      ).status,
    ).toBe(409)
  })

  it('cancels with a required reason stored in audit metadata and rejects later discharge', async () => {
    const patient = await createPatient('Cancellable')
    const created = await createAdmission(patient, { reason: 'Keep this reason' })
    const id = created.body.data.id as string

    expect(
      (
        await authorized('post', `/api/v1/admissions/${id}/cancel`, 'nurse').send({
          reason: 'Entered in error',
        })
      ).status,
    ).toBe(403)

    const blank = await authorized(
      'post',
      `/api/v1/admissions/${id}/cancel`,
      'operator',
    ).send({ reason: '  ' })
    expect(blank.status).toBe(400)

    const cancelled = await authorized(
      'post',
      `/api/v1/admissions/${id}/cancel`,
      'operator',
    ).send({ reason: 'Entered in error' })
    expect(cancelled.status, JSON.stringify(cancelled.body)).toBe(200)
    expect(cancelled.body.data.status).toBe('cancelled')
    expect(cancelled.body.data.reason).toBe('Keep this reason')
    expect(cancelled.body.data.dischargedAt).toBeNull()

    const cancelAudit = await prisma.auditLog.findFirst({
      where: { action: 'admission.cancel', resourceId: id },
    })
    expect(cancelAudit).toBeTruthy()
    expect(cancelAudit!.metadata).toMatchObject({
      cancellationReason: 'Entered in error',
      to: 'cancelled',
    })

    expect(
      (
        await authorized('post', `/api/v1/admissions/${id}/cancel`, 'operator').send({
          reason: 'Again',
        })
      ).status,
    ).toBe(409)
    expect(
      (
        await authorized('post', `/api/v1/admissions/${id}/discharge`, 'operator').send({
          dischargeSummary: 'Cannot discharge cancelled',
        })
      ).status,
    ).toBe(409)
  })

  it('allows only one concurrent lifecycle transition to succeed', async () => {
    const patient = await createPatient('Race')
    const created = await createAdmission(patient)
    const id = created.body.data.id as string
    const [discharge, cancel] = await Promise.all([
      authorized('post', `/api/v1/admissions/${id}/discharge`, 'operator').send({
        dischargeSummary: 'Race discharge',
      }),
      authorized('post', `/api/v1/admissions/${id}/cancel`, 'operator').send({
        reason: 'Race cancel',
      }),
    ])
    const statuses = [discharge.status, cancel.status].sort()
    expect(statuses).toEqual([200, 409])
    const current = await authorized('get', `/api/v1/admissions/${id}`, 'nurse')
    expect(['discharged', 'cancelled']).toContain(current.body.data.status)
  })

  it('returns 404 for a missing admission and does not leak database internals', async () => {
    const missing = randomUUID()
    const response = await authorized(
      'get',
      `/api/v1/admissions/${missing}`,
      'nurse',
    )
    expect(response.status).toBe(404)
    expect(JSON.stringify(response.body)).not.toMatch(/SQL|prisma|stack/i)
  })
})

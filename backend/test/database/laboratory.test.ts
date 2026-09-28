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
const prefix = `lab-${randomUUID().slice(0, 8)}`
const password = 'Valid password 42'
const roleIds: string[] = []
const userIds: string[] = []
const departmentIds: string[] = []
const employeeIds: string[] = []
const doctorIds: string[] = []
const patientIds: string[] = []
const medicalRecordIds: string[] = []
const labTestIds: string[] = []
const labRequestIds: string[] = []
const tokens = new Map<string, string>()
const userIdByRole = new Map<string, string>()

const labRead = [PERMISSIONS.labRequestRead] as const
const labDoctor = [
  PERMISSIONS.labTestRead,
  PERMISSIONS.labRequestRead,
  PERMISSIONS.labRequestCreate,
] as const
const labStaff = [
  PERMISSIONS.labRequestRead,
  PERMISSIONS.labSampleCollect,
  PERMISSIONS.labResultEnter,
] as const

const roleMatrix = {
  administrator: [
    ...labRead,
    PERMISSIONS.patientRead,
    PERMISSIONS.patientCreate,
    PERMISSIONS.patientUpdate,
    PERMISSIONS.departmentCreate,
    PERMISSIONS.employeeCreate,
    PERMISSIONS.employeeUpdate,
    PERMISSIONS.doctorCreate,
    PERMISSIONS.doctorUpdate,
    PERMISSIONS.medicalRecordRead,
    PERMISSIONS.medicalRecordCreate,
  ],
  receptionist: [
    PERMISSIONS.patientRead,
    PERMISSIONS.patientCreate,
  ],
  doctor: [...labDoctor, PERMISSIONS.patientRead, PERMISSIONS.medicalRecordRead],
  unlinked_doctor: [...labDoctor],
  nurse: [...labRead, PERMISSIONS.patientRead],
  laboratory_staff: [...labStaff],
  unlinked_lab: [...labStaff],
  pharmacist: [PERMISSIONS.prescriptionRead],
  accountant: [],
} as const

function assertSafeTestTarget(): void {
  if (process.env.HMS_DATABASE_TESTS !== 'true' || !process.env.DATABASE_URL) {
    throw new Error('Laboratory database tests require the guarded database runner.')
  }
  const url = new URL(process.env.DATABASE_URL)
  if (
    !['localhost', '127.0.0.1', '::1'].includes(url.hostname) ||
    url.pathname.replace(/^\//, '') !== 'hms_test'
  ) {
    throw new Error('Refusing to run laboratory tests outside local hms_test.')
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

function trackRequest(response: { status: number; body: { data?: { id?: string } } }) {
  if (response.status === 201 || response.status === 200) {
    const id = response.body.data?.id
    if (id && !labRequestIds.includes(id)) labRequestIds.push(id)
  }
}

async function createPatient(lastName: string, status?: 'inactive' | 'deceased'): Promise<string> {
  const response = await authorized('post', '/api/v1/patients', 'administrator').send({
    firstName: 'Fictional',
    lastName,
    dateOfBirth: '1990-05-01',
    dateOfBirthPrecision: 'month',
    sexAtRegistration: 'unknown',
  })
  expect(response.status, JSON.stringify(response.body)).toBe(201)
  const id = response.body.data.id as string
  patientIds.push(id)
  if (status) {
    const updated = await authorized('patch', `/api/v1/patients/${id}`, 'administrator').send({
      status,
    })
    expect(updated.status).toBe(200)
  }
  return id
}

beforeAll(async () => {
  const permissionIds = new Map<string, string>()
  const codes = Object.values(PERMISSIONS).filter(
    (value) =>
      value.startsWith('lab_') ||
      value.startsWith('patient.') ||
      value.startsWith('department.') ||
      value.startsWith('employee.') ||
      value.startsWith('doctor.') ||
      value.startsWith('medical_record.') ||
      value.startsWith('prescription.'),
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
        name: `Laboratory API ${roleName}`,
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
        { resourceId: { in: [...labRequestIds, ...patientIds, ...employeeIds] } },
      ],
    },
  })
  await prisma.refreshSession.deleteMany({ where: { userId: { in: userIds } } })
  await prisma.labResult.deleteMany({
    where: { labRequestItem: { labRequestId: { in: labRequestIds } } },
  })
  await prisma.labRequestItem.deleteMany({
    where: { labRequestId: { in: labRequestIds } },
  })
  await prisma.labRequest.deleteMany({ where: { id: { in: labRequestIds } } })
  await prisma.labTestDefinition.deleteMany({ where: { id: { in: labTestIds } } })
  await prisma.diagnosis.deleteMany({
    where: { medicalRecordId: { in: medicalRecordIds } },
  })
  await prisma.medicalRecord.deleteMany({ where: { id: { in: medicalRecordIds } } })
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

describe('laboratory authorization', () => {
  it.each([
    ['administrator', 200],
    ['doctor', 200],
    ['nurse', 200],
    ['receptionist', 403],
    ['laboratory_staff', 200],
    ['pharmacist', 403],
    ['accountant', 403],
  ])('enforces lab_request.read for %s', async (role, expected) => {
    expect((await authorized('get', '/api/v1/lab/requests', role)).status).toBe(expected)
  })

  it.each([
    ['administrator', 403],
    ['doctor', 200],
    ['nurse', 403],
    ['laboratory_staff', 403],
    ['receptionist', 403],
    ['pharmacist', 403],
    ['accountant', 403],
  ])('enforces lab_test.read for %s', async (role, expected) => {
    expect((await authorized('get', '/api/v1/lab/tests', role)).status).toBe(expected)
  })

  it('requires authentication', async () => {
    expect((await request(app).get('/api/v1/lab/requests')).status).toBe(401)
    expect((await request(app).get('/api/v1/lab/tests')).status).toBe(401)
  })
})

describe('laboratory workflow', () => {
  let patientA = ''
  let patientB = ''
  let inactivePatientId = ''
  let deceasedPatientId = ''
  let linkedDoctorId = ''
  let linkedEmployeeId = ''
  let labEmployeeId = ''
  let departmentId = ''
  let medicalRecordA = ''
  let medicalRecordB = ''
  let activeTestId = ''
  let secondTestId = ''
  let inactiveTestId = ''

  beforeAll(async () => {
    patientA = await createPatient(`Alpha${prefix.slice(-4)}`)
    patientB = await createPatient(`Beta${prefix.slice(-4)}`)
    inactivePatientId = await createPatient(`Inactive${prefix.slice(-4)}`, 'inactive')
    deceasedPatientId = await createPatient(`Deceased${prefix.slice(-4)}`, 'deceased')

    const department = await authorized('post', '/api/v1/departments', 'administrator').send({
      code: `${prefix}-dep`.slice(0, 30),
      name: `${prefix} laboratory`,
    })
    expect(department.status).toBe(201)
    departmentId = department.body.data.id
    departmentIds.push(departmentId)

    const doctorEmployee = await authorized('post', '/api/v1/employees', 'administrator').send({
      firstName: 'Fictional',
      lastName: 'Clinician',
      jobTitle: 'Physician',
      departmentId,
      hireDate: '2020-01-15',
      userId: userIdByRole.get('doctor'),
    })
    expect(doctorEmployee.status, JSON.stringify(doctorEmployee.body)).toBe(201)
    linkedEmployeeId = doctorEmployee.body.data.id
    employeeIds.push(linkedEmployeeId)

    const doctor = await authorized('post', '/api/v1/doctors', 'administrator').send({
      employeeId: linkedEmployeeId,
      licenseNumber: `LIC-${prefix}`,
      specialization: 'General',
    })
    expect(doctor.status, JSON.stringify(doctor.body)).toBe(201)
    linkedDoctorId = doctor.body.data.id
    doctorIds.push(linkedDoctorId)

    const labEmployee = await authorized('post', '/api/v1/employees', 'administrator').send({
      firstName: 'Fictional',
      lastName: 'Analyst',
      jobTitle: 'Laboratory Staff',
      departmentId,
      hireDate: '2021-03-01',
      userId: userIdByRole.get('laboratory_staff'),
    })
    expect(labEmployee.status, JSON.stringify(labEmployee.body)).toBe(201)
    labEmployeeId = labEmployee.body.data.id
    employeeIds.push(labEmployeeId)

    const medicalA = await prisma.medicalRecord.create({
      data: {
        patientId: patientA,
        authorEmployeeId: linkedEmployeeId,
        occurredAt: new Date('2030-03-01T10:00:00.000Z'),
        status: 'draft',
      },
    })
    medicalRecordA = medicalA.id
    medicalRecordIds.push(medicalRecordA)

    const medicalB = await prisma.medicalRecord.create({
      data: {
        patientId: patientB,
        authorEmployeeId: linkedEmployeeId,
        occurredAt: new Date('2030-03-01T11:00:00.000Z'),
        status: 'draft',
      },
    })
    medicalRecordB = medicalB.id
    medicalRecordIds.push(medicalRecordB)

    const active = await prisma.labTestDefinition.create({
      data: { code: `CBC-${prefix}`, name: `Complete blood count ${prefix}` },
    })
    activeTestId = active.id
    labTestIds.push(active.id)

    const second = await prisma.labTestDefinition.create({
      data: { code: `GLU-${prefix}`, name: `Glucose ${prefix}` },
    })
    secondTestId = second.id
    labTestIds.push(second.id)

    const inactive = await prisma.labTestDefinition.create({
      data: {
        code: `INA-${prefix}`,
        name: `Inactive panel ${prefix}`,
        status: 'inactive',
      },
    })
    inactiveTestId = inactive.id
    labTestIds.push(inactive.id)
  })

  it('lists only active catalog tests for doctors', async () => {
    const response = await authorized('get', '/api/v1/lab/tests', 'doctor')
    expect(response.status).toBe(200)
    const codes = response.body.data.map((row: { code: string }) => row.code)
    expect(codes).toContain(`CBC-${prefix}`)
    expect(codes).not.toContain(`INA-${prefix}`)
  })

  it('rejects client-supplied requesting doctor identity', async () => {
    const response = await authorized('post', '/api/v1/lab/requests', 'doctor').send({
      patientId: patientA,
      requestedByDoctorId: linkedDoctorId,
      items: [{ testDefinitionId: activeTestId }],
    })
    expect(response.status).toBe(400)
  })

  it('rejects an unlinked doctor', async () => {
    const response = await authorized('post', '/api/v1/lab/requests', 'unlinked_doctor').send({
      patientId: patientA,
      items: [{ testDefinitionId: activeTestId }],
    })
    expect(response.status).toBe(409)
  })

  it('rejects an inactive doctor profile', async () => {
    await prisma.doctorProfile.update({
      where: { id: linkedDoctorId },
      data: { status: 'inactive' },
    })
    const response = await authorized('post', '/api/v1/lab/requests', 'doctor').send({
      patientId: patientA,
      items: [{ testDefinitionId: activeTestId }],
    })
    expect(response.status).toBe(409)
    await prisma.doctorProfile.update({
      where: { id: linkedDoctorId },
      data: { status: 'active' },
    })
  })

  it('rejects inactive tests and missing patients', async () => {
    const inactive = await authorized('post', '/api/v1/lab/requests', 'doctor').send({
      patientId: patientA,
      items: [{ testDefinitionId: inactiveTestId }],
    })
    expect(inactive.status).toBe(409)
    const missing = await authorized('post', '/api/v1/lab/requests', 'doctor').send({
      patientId: randomUUID(),
      items: [{ testDefinitionId: activeTestId }],
    })
    expect(missing.status).toBe(404)
  })

  it('rejects a medical record that belongs to another patient', async () => {
    const response = await authorized('post', '/api/v1/lab/requests', 'doctor').send({
      patientId: patientA,
      medicalRecordId: medicalRecordB,
      items: [{ testDefinitionId: activeTestId }],
    })
    expect(response.status).toBe(409)
  })

  it('creates a request with duplicate tests, optional note, and inactive or deceased patients', async () => {
    const created = await authorized('post', '/api/v1/lab/requests', 'doctor').send({
      patientId: patientA,
      medicalRecordId: medicalRecordA,
      clinicalNote: 'Fictional follow-up panel',
      items: [
        { testDefinitionId: activeTestId },
        { testDefinitionId: activeTestId },
        { testDefinitionId: secondTestId },
      ],
    })
    expect(created.status, JSON.stringify(created.body)).toBe(201)
    trackRequest(created)
    expect(created.body.data.requestedByDoctorId).toBe(linkedDoctorId)
    expect(created.body.data.status).toBe('requested')
    expect(created.body.data.items).toHaveLength(3)
    expect(created.body.data.clinicalNote).toBe('Fictional follow-up panel')

    const inactive = await authorized('post', '/api/v1/lab/requests', 'doctor').send({
      patientId: inactivePatientId,
      items: [{ testDefinitionId: activeTestId }],
    })
    expect(inactive.status, JSON.stringify(inactive.body)).toBe(201)
    trackRequest(inactive)

    const deceased = await authorized('post', '/api/v1/lab/requests', 'doctor').send({
      patientId: deceasedPatientId,
      items: [{ testDefinitionId: activeTestId }],
    })
    expect(deceased.status, JSON.stringify(deceased.body)).toBe(201)
    trackRequest(deceased)
  })

  it('does not expose PATCH, cancel, or result-edit endpoints', async () => {
    const requestId = labRequestIds[0]!
    expect(
      (await authorized('patch', `/api/v1/lab/requests/${requestId}`, 'doctor').send({
        clinicalNote: 'changed',
      })).status,
    ).toBe(404)
    expect(
      (await authorized('post', `/api/v1/lab/requests/${requestId}/cancel`, 'doctor').send({})).status,
    ).toBe(404)
    expect(
      (await authorized('post', '/api/v1/lab/tests', 'doctor').send({
        code: 'X',
        name: 'X',
      })).status,
    ).toBe(404)
  })

  it('forbids create, collect, and result entry for non-operator roles', async () => {
    const requestId = labRequestIds[0]!
    const itemId = (
      await authorized('get', `/api/v1/lab/requests/${requestId}`, 'doctor')
    ).body.data.items[0].id as string
    expect(
      (await authorized('post', '/api/v1/lab/requests', 'administrator').send({
        patientId: patientA,
        items: [{ testDefinitionId: activeTestId }],
      })).status,
    ).toBe(403)
    expect(
      (await authorized('post', '/api/v1/lab/requests', 'nurse').send({
        patientId: patientA,
        items: [{ testDefinitionId: activeTestId }],
      })).status,
    ).toBe(403)
    expect(
      (await authorized('post', '/api/v1/lab/requests', 'laboratory_staff').send({
        patientId: patientA,
        items: [{ testDefinitionId: activeTestId }],
      })).status,
    ).toBe(403)
    expect(
      (await authorized(
        'post',
        `/api/v1/lab/requests/${requestId}/items/${itemId}/sample`,
        'doctor',
      ).send({})).status,
    ).toBe(403)
    expect(
      (await authorized(
        'post',
        `/api/v1/lab/requests/${requestId}/items/${itemId}/results`,
        'nurse',
      ).send({ resultValue: 'negative' })).status,
    ).toBe(403)
  })

  it('rejects collection without an employee and rejects client collector IDs', async () => {
    const created = await authorized('post', '/api/v1/lab/requests', 'doctor').send({
      patientId: patientA,
      items: [{ testDefinitionId: activeTestId }],
    })
    trackRequest(created)
    const itemId = created.body.data.items[0].id as string
    expect(
      (await authorized(
        'post',
        `/api/v1/lab/requests/${created.body.data.id}/items/${itemId}/sample`,
        'unlinked_lab',
      ).send({})).status,
    ).toBe(409)
    expect(
      (await authorized(
        'post',
        `/api/v1/lab/requests/${created.body.data.id}/items/${itemId}/sample`,
        'laboratory_staff',
      ).send({ collectedByEmployeeId: labEmployeeId })).status,
    ).toBe(400)
  })

  it('collects samples, enters results, and aggregates parent status', async () => {
    const created = await authorized('post', '/api/v1/lab/requests', 'doctor').send({
      patientId: patientA,
      items: [
        { testDefinitionId: activeTestId },
        { testDefinitionId: secondTestId },
      ],
    })
    expect(created.status).toBe(201)
    trackRequest(created)
    const requestId = created.body.data.id as string
    const firstItem = created.body.data.items[0].id as string
    const secondItem = created.body.data.items[1].id as string

    const tooEarly = await authorized(
      'post',
      `/api/v1/lab/requests/${requestId}/items/${firstItem}/results`,
      'laboratory_staff',
    ).send({ resultValue: 'negative' })
    expect(tooEarly.status).toBe(409)

    const firstCollect = await authorized(
      'post',
      `/api/v1/lab/requests/${requestId}/items/${firstItem}/sample`,
      'laboratory_staff',
    ).send({})
    expect(firstCollect.status, JSON.stringify(firstCollect.body)).toBe(200)
    expect(firstCollect.body.data.status).toBe('in_progress')
    expect(firstCollect.body.data.items.find((item: { id: string }) => item.id === firstItem).status)
      .toBe('sample_collected')
    expect(
      firstCollect.body.data.items.find((item: { id: string }) => item.id === firstItem)
        .sampleCollectedByEmployeeId,
    ).toBe(labEmployeeId)

    const secondCollect = await authorized(
      'post',
      `/api/v1/lab/requests/${requestId}/items/${secondItem}/sample`,
      'laboratory_staff',
    ).send({})
    expect(secondCollect.status).toBe(200)
    expect(secondCollect.body.data.status).toBe('sample_collected')

    const repeatCollect = await authorized(
      'post',
      `/api/v1/lab/requests/${requestId}/items/${firstItem}/sample`,
      'laboratory_staff',
    ).send({})
    expect(repeatCollect.status).toBe(409)

    const blank = await authorized(
      'post',
      `/api/v1/lab/requests/${requestId}/items/${firstItem}/results`,
      'laboratory_staff',
    ).send({ resultValue: '   ' })
    expect(blank.status).toBe(400)

    const firstResult = await authorized(
      'post',
      `/api/v1/lab/requests/${requestId}/items/${firstItem}/results`,
      'laboratory_staff',
    ).send({
      resultValue: 'negative',
      resultUnit: 'n/a',
      referenceRangeSnapshot: '4.0-11.0 10^9/L',
      resultNote: 'Fictional note',
    })
    expect(firstResult.status, JSON.stringify(firstResult.body)).toBe(200)
    expect(firstResult.body.data.status).toBe('in_progress')
    const completedItem = firstResult.body.data.items.find(
      (item: { id: string }) => item.id === firstItem,
    )
    expect(completedItem.status).toBe('completed')
    expect(completedItem.results[0].versionNumber).toBe(1)
    expect(completedItem.results[0].enteredByEmployeeId).toBe(labEmployeeId)
    expect(completedItem.results[0].referenceRangeSnapshot).toBe('4.0-11.0 10^9/L')
    expect(completedItem.results[0].finalizedByEmployeeId).toBeUndefined()

    const duplicateResult = await authorized(
      'post',
      `/api/v1/lab/requests/${requestId}/items/${firstItem}/results`,
      'laboratory_staff',
    ).send({ resultValue: 'positive' })
    expect(duplicateResult.status).toBe(409)

    const resultEdit = await authorized(
      'patch',
      `/api/v1/lab/requests/${requestId}/items/${firstItem}/results`,
      'laboratory_staff',
    ).send({ resultValue: 'changed' })
    expect(resultEdit.status).toBe(404)

    const secondResult = await authorized(
      'post',
      `/api/v1/lab/requests/${requestId}/items/${secondItem}/results`,
      'laboratory_staff',
    ).send({ resultValue: '5.1' })
    expect(secondResult.status).toBe(200)
    expect(secondResult.body.data.status).toBe('completed')

    const reportView = await authorized('get', `/api/v1/lab/requests/${requestId}`, 'nurse')
    expect(reportView.status).toBe(200)
    expect(reportView.body.data.items[0].results[0].resultValue).toBeDefined()

    const audits = await prisma.auditLog.findMany({
      where: {
        resourceId: { in: [requestId, firstItem, secondItem, completedItem.results[0].id] },
        action: { in: ['lab_request.create', 'lab_request.sample_collect', 'lab_result.enter'] },
      },
    })
    expect(audits.length).toBeGreaterThan(0)
    for (const audit of audits) {
      const metadata = JSON.stringify(audit.metadata)
      expect(metadata).not.toContain('negative')
      expect(metadata).not.toContain('Fictional note')
      expect(metadata).not.toContain('Fictional follow-up panel')
    }
  })

  it('rejects result entry from an inactive laboratory employee', async () => {
    const created = await authorized('post', '/api/v1/lab/requests', 'doctor').send({
      patientId: patientA,
      items: [{ testDefinitionId: activeTestId }],
    })
    trackRequest(created)
    const itemId = created.body.data.items[0].id as string
    await authorized(
      'post',
      `/api/v1/lab/requests/${created.body.data.id}/items/${itemId}/sample`,
      'laboratory_staff',
    ).send({})
    await prisma.employee.update({
      where: { id: labEmployeeId },
      data: { employmentStatus: 'inactive' },
    })
    const result = await authorized(
      'post',
      `/api/v1/lab/requests/${created.body.data.id}/items/${itemId}/results`,
      'laboratory_staff',
    ).send({ resultValue: 'negative' })
    expect(result.status).toBe(409)
    await prisma.employee.update({
      where: { id: labEmployeeId },
      data: { employmentStatus: 'active' },
    })
  })
})

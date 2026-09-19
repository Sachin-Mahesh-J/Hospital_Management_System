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
const prefix = `patient-api-${randomUUID().slice(0, 8)}`
const password = 'Valid password 42'
const roleIds: string[] = []
const userIds: string[] = []
const patientIds: string[] = []
const tokens = new Map<string, string>()

const roleMatrix = {
  administrator: [
    PERMISSIONS.patientRead,
    PERMISSIONS.patientCreate,
    PERMISSIONS.patientUpdate,
  ],
  receptionist: [
    PERMISSIONS.patientRead,
    PERMISSIONS.patientCreate,
    PERMISSIONS.patientUpdate,
  ],
  doctor: [PERMISSIONS.patientRead],
  nurse: [PERMISSIONS.patientRead],
  laboratory_staff: [],
  pharmacist: [],
  accountant: [],
} as const

function assertSafeTestTarget(): void {
  if (process.env.HMS_DATABASE_TESTS !== 'true' || !process.env.DATABASE_URL) {
    throw new Error('Patient database tests require the guarded database runner.')
  }
  const url = new URL(process.env.DATABASE_URL)
  if (
    !['localhost', '127.0.0.1', '::1'].includes(url.hostname) ||
    url.pathname.replace(/^\//, '') !== 'hms_test'
  ) {
    throw new Error('Refusing to run patient tests outside local hms_test.')
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

function authorized(method: 'get' | 'post' | 'patch', path: string, role: string) {
  return request(app)[method](path).set(
    'Authorization',
    `Bearer ${tokens.get(role)}`,
  )
}

const validPatient = {
  firstName: 'Fictional',
  lastName: 'Testperson',
  dateOfBirth: '1990-05-01',
  dateOfBirthPrecision: 'month',
  sexAtRegistration: 'unknown',
  phone: '555-0101',
  email: 'fictional.patient@example.test',
  addressText: '1 Test Street',
  emergencyContactName: 'Example Contact',
  emergencyContactPhone: '555-0102',
}

beforeAll(async () => {
  const permissionIds = new Map<string, string>()
  for (const code of [
    PERMISSIONS.patientRead,
    PERMISSIONS.patientCreate,
    PERMISSIONS.patientUpdate,
  ]) {
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
        name: `Patient API ${roleName}`,
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
    where: { OR: [{ actorUserId: { in: userIds } }, { resourceId: { in: patientIds } }] },
  })
  await prisma.refreshSession.deleteMany({ where: { userId: { in: userIds } } })
  await prisma.patient.deleteMany({ where: { id: { in: patientIds } } })
  await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } })
  await prisma.user.deleteMany({ where: { id: { in: userIds } } })
  await prisma.rolePermission.deleteMany({ where: { roleId: { in: roleIds } } })
  await prisma.role.deleteMany({ where: { id: { in: roleIds } } })
  await database.disconnect()
  await prisma.$disconnect()
})

describe('patient API', () => {
  it('requires authentication and rejects forbidden roles', async () => {
    expect((await request(app).get('/api/v1/patients')).status).toBe(401)
    expect(
      (await authorized('get', '/api/v1/patients', 'laboratory_staff')).status,
    ).toBe(403)
  })

  it.each([
    ['administrator', 200],
    ['receptionist', 200],
    ['doctor', 200],
    ['nurse', 200],
    ['laboratory_staff', 403],
    ['pharmacist', 403],
    ['accountant', 403],
  ])('enforces patient.read for %s', async (role, expected) => {
    expect((await authorized('get', '/api/v1/patients', role)).status).toBe(
      expected,
    )
  })

  it.each([
    ['administrator', 201],
    ['receptionist', 201],
    ['doctor', 403],
    ['nurse', 403],
    ['laboratory_staff', 403],
    ['pharmacist', 403],
    ['accountant', 403],
  ])('enforces patient.create for %s', async (role, expected) => {
    const response = await authorized('post', '/api/v1/patients', role).send({
      ...validPatient,
      email: `${role}-${randomUUID()}@example.test`,
    })
    expect(response.status).toBe(expected)
    if (response.status === 201) patientIds.push(response.body.data.id)
  })

  it.each([
    ['administrator', 404],
    ['receptionist', 404],
    ['doctor', 403],
    ['nurse', 403],
    ['laboratory_staff', 403],
    ['pharmacist', 403],
    ['accountant', 403],
  ])('enforces patient.update for %s', async (role, expected) => {
    const response = await authorized(
      'patch',
      `/api/v1/patients/${randomUUID()}`,
      role,
    ).send({ phone: '555-0188' })
    expect(response.status).toBe(expected)
  })

  it('creates, gets, updates, searches, filters, and paginates patients', async () => {
    const created = await authorized('post', '/api/v1/patients', 'receptionist')
      .send(validPatient)
    expect(created.status).toBe(201)
    patientIds.push(created.body.data.id)
    expect(created.body.data.patientNumber).toMatch(/^P-[0-9a-f-]{36}$/)

    const id = created.body.data.id as string
    expect((await authorized('get', `/api/v1/patients/${id}`, 'doctor')).body.data)
      .toMatchObject({ id, firstName: 'Fictional' })

    const updated = await authorized(
      'patch',
      `/api/v1/patients/${id}`,
      'administrator',
    ).send({ phone: '555-0199', status: 'inactive' })
    expect(updated.status).toBe(200)
    expect(updated.body.data).toMatchObject({ phone: '555-0199', status: 'inactive' })

    const listed = await authorized(
      'get',
      '/api/v1/patients?page=1&pageSize=1&search=Testperson&status=inactive',
      'nurse',
    )
    expect(listed.status).toBe(200)
    expect(listed.body.data).toHaveLength(1)
    expect(listed.body.meta.pagination).toMatchObject({ page: 1, pageSize: 1 })

    const audit = await prisma.auditLog.findMany({ where: { resourceId: id } })
    expect(audit.map((entry) => entry.action)).toEqual(
      expect.arrayContaining(['patient.create', 'patient.status_update']),
    )
    expect(JSON.stringify(audit)).not.toContain(validPatient.email)
  })

  it('returns safe validation and not-found errors', async () => {
    const future = await authorized('post', '/api/v1/patients', 'receptionist')
      .send({ ...validPatient, dateOfBirth: '2999-01-01' })
    expect(future.status).toBe(400)
    expect(future.body.error.code).toBe('VALIDATION_ERROR')

    expect(
      (await authorized('get', '/api/v1/patients/not-a-uuid', 'doctor')).status,
    ).toBe(400)
    expect(
      (
        await authorized(
          'get',
          `/api/v1/patients/${randomUUID()}`,
          'doctor',
        )
      ).status,
    ).toBe(404)
    expect(
      (
        await authorized('get', '/api/v1/patients?sortBy=passwordHash', 'doctor')
      ).status,
    ).toBe(400)
  })

  it('rejects mass assignment, deletion, and colliding patient numbers', async () => {
    const created = await authorized('post', '/api/v1/patients', 'receptionist')
      .send({
        ...validPatient,
        dateOfBirth: null,
        dateOfBirthPrecision: 'unknown',
        email: `unique-${randomUUID()}@example.test`,
      })
    expect(created.status).toBe(201)
    patientIds.push(created.body.data.id)
    expect(created.body.data.dateOfBirth).toBeNull()

    const second = await authorized('post', '/api/v1/patients', 'receptionist')
      .send({
        ...validPatient,
        email: `unique-${randomUUID()}@example.test`,
      })
    expect(second.status).toBe(201)
    patientIds.push(second.body.data.id)
    expect(second.body.data.patientNumber).not.toBe(created.body.data.patientNumber)

    expect(
      (
        await authorized(
          'patch',
          `/api/v1/patients/${created.body.data.id}`,
          'receptionist',
        ).send({ patientNumber: 'MANUAL-1', id: randomUUID() })
      ).status,
    ).toBe(400)

    const deleted = await request(app)
      .delete(`/api/v1/patients/${created.body.data.id}`)
      .set('Authorization', `Bearer ${tokens.get('administrator')}`)
    expect(deleted.status).toBe(404)
    expect(deleted.body.error.code).toBe('ROUTE_NOT_FOUND')

    await expect(
      prisma.patient.create({
        data: {
          patientNumber: created.body.data.patientNumber,
          firstName: 'Collision',
          lastName: 'Check',
          dateOfBirthPrecision: 'unknown',
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' })
  })
})

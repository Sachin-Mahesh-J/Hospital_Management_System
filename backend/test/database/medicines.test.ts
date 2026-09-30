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
const prefix = `med-api-${randomUUID().slice(0, 8)}`
const password = 'Valid password 42'
const roleIds: string[] = []
const userIds: string[] = []
const medicineIds: string[] = []
const tokens = new Map<string, string>()

const catalogueAdmin = [
  PERMISSIONS.medicineRead,
  PERMISSIONS.medicineCreate,
  PERMISSIONS.medicineUpdate,
  PERMISSIONS.medicineDeactivate,
  PERMISSIONS.medicineReactivate,
] as const

const roleMatrix = {
  administrator: [...catalogueAdmin],
  doctor: [PERMISSIONS.medicineRead],
  pharmacist: [PERMISSIONS.medicineRead],
  nurse: [],
  receptionist: [],
  laboratory_staff: [],
  accountant: [],
} as const

function assertSafeTestTarget(): void {
  if (process.env.HMS_DATABASE_TESTS !== 'true' || !process.env.DATABASE_URL) {
    throw new Error('Medicine database tests require the guarded database runner.')
  }
  const url = new URL(process.env.DATABASE_URL)
  if (
    !['localhost', '127.0.0.1', '::1'].includes(url.hostname) ||
    url.pathname.replace(/^\//, '') !== 'hms_test'
  ) {
    throw new Error('Refusing to run medicine tests outside local hms_test.')
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

const createPayload = (suffix: string) => ({
  code: `${prefix}-${suffix}`.slice(0, 50),
  genericName: `${prefix} ${suffix}`,
  dosageForm: 'tablet',
  inventoryUnit: 'tablet',
  currency: 'LKR',
})

beforeAll(async () => {
  const permissionIds = new Map<string, string>()
  for (const code of Object.values(PERMISSIONS).filter((value) =>
    value.startsWith('medicine.'),
  )) {
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
        name: `Medicine API ${prefix} ${roleName}`,
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
        { resourceId: { in: medicineIds } },
      ],
    },
  })
  await prisma.refreshSession.deleteMany({ where: { userId: { in: userIds } } })
  await prisma.medicine.deleteMany({ where: { id: { in: medicineIds } } })
  await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } })
  await prisma.user.deleteMany({ where: { id: { in: userIds } } })
  await prisma.rolePermission.deleteMany({ where: { roleId: { in: roleIds } } })
  await prisma.role.deleteMany({ where: { id: { in: roleIds } } })
  await database.disconnect()
  await prisma.$disconnect()
})

describe('medicine catalogue authorization', () => {
  it.each([
    ['administrator', 200],
    ['doctor', 200],
    ['pharmacist', 200],
    ['nurse', 403],
    ['receptionist', 403],
    ['laboratory_staff', 403],
    ['accountant', 403],
  ])('enforces medicine.read for %s', async (role, expected) => {
    expect((await authorized('get', '/api/v1/medicines', role)).status).toBe(expected)
  })

  it.each([
    ['administrator', 201],
    ['doctor', 403],
    ['pharmacist', 403],
    ['nurse', 403],
    ['receptionist', 403],
    ['laboratory_staff', 403],
    ['accountant', 403],
  ])('enforces medicine.create for %s', async (role, expected) => {
    const response = await authorized('post', '/api/v1/medicines', role).send(
      createPayload(role),
    )
    expect(response.status).toBe(expected)
    if (response.status === 201) medicineIds.push(response.body.data.id)
  })

  it('requires authentication', async () => {
    expect((await request(app).get('/api/v1/medicines')).status).toBe(401)
    expect((await request(app).post('/api/v1/medicines').send({})).status).toBe(401)
  })
})

describe('medicine catalogue workflow', () => {
  it('creates, reads, updates, deactivates, and reactivates a medicine', async () => {
    const created = await authorized('post', '/api/v1/medicines', 'administrator').send({
      ...createPayload('PARA'),
      brandName: 'Fictional Panadol',
      strength: '500 mg',
      defaultSalePrice: '12.5',
      lowStockThreshold: '20',
    })
    expect(created.status, JSON.stringify(created.body)).toBe(201)
    const id = created.body.data.id as string
    medicineIds.push(id)
    expect(created.body.data).toMatchObject({
      code: `${prefix}-PARA`.slice(0, 50),
      genericName: `${prefix} PARA`,
      status: 'active',
      currency: 'LKR',
      defaultSalePrice: '12.5',
      lowStockThreshold: '20',
    })
    expect(created.body.data.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    )

    expect(
      (await authorized('get', `/api/v1/medicines/${id}`, 'doctor')).body.data,
    ).toMatchObject({ id, status: 'active' })

    const updated = await authorized(
      'patch',
      `/api/v1/medicines/${id}`,
      'administrator',
    ).send({ genericName: `${prefix} Paracetamol` })
    expect(updated.status).toBe(200)
    expect(updated.body.data.genericName).toBe(`${prefix} Paracetamol`)
    expect(updated.body.data.status).toBe('active')

    expect(
      (
        await authorized('patch', `/api/v1/medicines/${id}`, 'doctor').send({
          genericName: 'Forbidden',
        })
      ).status,
    ).toBe(403)
    expect(
      (
        await authorized('patch', `/api/v1/medicines/${id}`, 'pharmacist').send({
          genericName: 'Forbidden',
        })
      ).status,
    ).toBe(403)

    const deactivated = await authorized(
      'post',
      `/api/v1/medicines/${id}/deactivate`,
      'administrator',
    ).send()
    expect(deactivated.status).toBe(200)
    expect(deactivated.body.data.status).toBe('inactive')

    expect(
      (await authorized('post', `/api/v1/medicines/${id}/deactivate`, 'doctor').send())
        .status,
    ).toBe(403)
    expect(
      (
        await authorized('post', `/api/v1/medicines/${id}/deactivate`, 'pharmacist').send()
      ).status,
    ).toBe(403)

    const activeOnly = await authorized(
      'get',
      '/api/v1/medicines?status=active',
      'doctor',
    )
    expect(activeOnly.status).toBe(200)
    expect(
      activeOnly.body.data.some((row: { id: string }) => row.id === id),
    ).toBe(false)

    const allRows = await authorized('get', `/api/v1/medicines?search=${prefix}`, 'administrator')
    expect(allRows.body.data.some((row: { id: string }) => row.id === id)).toBe(true)

    const reactivated = await authorized(
      'post',
      `/api/v1/medicines/${id}/reactivate`,
      'administrator',
    ).send()
    expect(reactivated.status).toBe(200)
    expect(reactivated.body.data.status).toBe('active')
    expect(
      (await authorized('post', `/api/v1/medicines/${id}/reactivate`, 'doctor').send())
        .status,
    ).toBe(403)

    const duplicate = await authorized('post', '/api/v1/medicines', 'administrator').send(
      createPayload('PARA'),
    )
    expect(duplicate.status).toBe(409)
    expect(duplicate.body.error.code).toBe('RESOURCE_CONFLICT')
    expect(JSON.stringify(duplicate.body)).not.toContain('Prisma')

    const deleted = await request(app)
      .delete(`/api/v1/medicines/${id}`)
      .set('Authorization', `Bearer ${tokens.get('administrator')}`)
    expect(deleted.status).toBe(404)

    const audit = await prisma.auditLog.findMany({ where: { resourceId: id } })
    expect(audit.map((entry) => entry.action)).toEqual(
      expect.arrayContaining([
        'medicine.create',
        'medicine.update',
        'medicine.deactivate',
        'medicine.reactivate',
      ]),
    )
    for (const row of audit) {
      const metadata = row.metadata as Record<string, unknown>
      expect(metadata).not.toHaveProperty('password')
      expect(metadata).not.toHaveProperty('note')
      expect(metadata).not.toHaveProperty('instructions')
    }
  })

  it('rejects invalid sort expressions and unknown status values', async () => {
    expect(
      (await authorized('get', '/api/v1/medicines?sortBy=passwordHash', 'administrator'))
        .status,
    ).toBe(400)
    expect(
      (
        await authorized('post', '/api/v1/medicines', 'administrator').send({
          code: `${prefix}-BAD`,
          genericName: `${prefix} Bad`,
          dosageForm: 'tablet',
          inventoryUnit: 'tablet',
          currency: 'RUPEE',
        })
      ).status,
    ).toBe(400)
  })
})

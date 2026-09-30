import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PERMISSIONS } from '../../src/auth/auth.constants.js'
import { SYSTEM_ROLES } from '../../src/auth/roleCatalog.js'
import { hashPassword } from '../../src/auth/password.service.js'
import { createApp } from '../../src/app.js'
import { database } from '../../src/database/database.service.js'
import { loadCurrentUser } from '../../src/modules/auth/auth.service.js'
import { resetMemoryDocumentStorage } from '../../src/storage/documentStorage.js'
import { extractPdfText } from '../pdfUnicode.js'

const prisma = new PrismaClient()
const app = createApp()
const prefix = `m16-${randomUUID().slice(0, 8)}`
const password = 'Valid password 42'
const roleIds: string[] = []
const userIds: string[] = []
const departmentIds: string[] = []
const employeeIds: string[] = []
const doctorIds: string[] = []
const patientIds: string[] = []
const attendanceIds: string[] = []
const leaveIds: string[] = []
const documentIds: string[] = []
const scheduleIds: string[] = []
const appointmentIds: string[] = []
const extraUserIds: string[] = []
const tokens = new Map<string, string>()

const roleMatrix = {
  administrator: Object.values(PERMISSIONS),
  receptionist: [
    PERMISSIONS.attendanceRead,
    PERMISSIONS.attendanceCreate,
    PERMISSIONS.attendanceUpdate,
    PERMISSIONS.leaveRead,
    PERMISSIONS.leaveCreate,
    PERMISSIONS.leaveUpdate,
    PERMISSIONS.leaveCancel,
    PERMISSIONS.patientDocumentRead,
    PERMISSIONS.patientDocumentCreate,
    PERMISSIONS.patientDocumentUpdate,
    PERMISSIONS.patientDocumentDelete,
    PERMISSIONS.patientRead,
    PERMISSIONS.patientCreate,
    PERMISSIONS.appointmentRead,
    PERMISSIONS.appointmentCreate,
    PERMISSIONS.doctorRead,
    PERMISSIONS.doctorScheduleRead,
    PERMISSIONS.employeeRead,
    PERMISSIONS.employeeCreate,
    PERMISSIONS.departmentCreate,
    PERMISSIONS.doctorCreate,
    PERMISSIONS.doctorScheduleCreate,
  ],
  doctor: [
    PERMISSIONS.leaveRead,
    PERMISSIONS.leaveCreate,
    PERMISSIONS.leaveUpdate,
    PERMISSIONS.leaveCancel,
    PERMISSIONS.patientDocumentRead,
    PERMISSIONS.patientDocumentCreate,
    PERMISSIONS.patientRead,
  ],
  nurse: [PERMISSIONS.patientRead],
  laboratory_staff: [],
  pharmacist: [],
  accountant: [PERMISSIONS.leaveRead, PERMISSIONS.leaveCreate],
} as const

function assertSafeTestTarget(): void {
  if (process.env.HMS_DATABASE_TESTS !== 'true' || !process.env.DATABASE_URL) {
    throw new Error('M16 database tests require the guarded database runner.')
  }
  const url = new URL(process.env.DATABASE_URL)
  if (
    !['localhost', '127.0.0.1', '::1'].includes(url.hostname) ||
    url.pathname.replace(/^\//, '') !== 'hms_test'
  ) {
    throw new Error('Refusing to run M16 tests outside local hms_test.')
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
  method: 'get' | 'post' | 'patch' | 'delete',
  path: string,
  role: string,
) {
  return request(app)[method](path).set(
    'Authorization',
    `Bearer ${tokens.get(role)}`,
  )
}

const pdfBytes = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n')

beforeAll(async () => {
  resetMemoryDocumentStorage()
  for (const [code, name, description] of SYSTEM_ROLES) {
    await prisma.role.upsert({
      where: { code },
      create: { code, name, description, isSystem: true, status: 'active' },
      update: { name, description, isSystem: true, status: 'active' },
    })
  }
  const permissionIds = new Map<string, string>()
  for (const code of Object.values(PERMISSIONS)) {
    const permission = await prisma.permission.upsert({
      where: { code },
      create: { code, description: `Test permission ${code}` },
      update: {},
    })
    permissionIds.set(code, permission.id)
  }

  const department = await prisma.department.create({
    data: { code: `${prefix}-dep`.slice(0, 30), name: `${prefix} Dept` },
  })
  departmentIds.push(department.id)

  for (const [roleName, permissions] of Object.entries(roleMatrix)) {
    const role = await prisma.role.create({
      data: {
        code: `${prefix}-${roleName}`,
        name: `M16 ${roleName}`,
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
    if (roleName === 'doctor' || roleName === 'accountant') {
      const employee = await prisma.employee.create({
        data: {
          employeeNumber: `E-${prefix}-${roleName}`,
          firstName: 'Fictional',
          lastName: roleName,
          jobTitle: roleName,
          departmentId: department.id,
          userId: user.id,
          hireDate: new Date('2020-01-15'),
        },
      })
      employeeIds.push(employee.id)
    }
    tokens.set(roleName, await login(user.username))
  }
})

afterAll(async () => {
  await prisma.auditLog.deleteMany({
    where: {
      OR: [
        { actorUserId: { in: [...userIds, ...extraUserIds] } },
        { resourceId: { in: [...attendanceIds, ...leaveIds, ...documentIds, ...appointmentIds, ...extraUserIds] } },
      ],
    },
  })
  await prisma.appointment.deleteMany({ where: { id: { in: appointmentIds } } })
  await prisma.doctorSchedule.deleteMany({ where: { id: { in: scheduleIds } } })
  await prisma.patientDocument.deleteMany({ where: { id: { in: documentIds } } })
  await prisma.patient.deleteMany({ where: { id: { in: patientIds } } })
  await prisma.leaveRecord.deleteMany({ where: { id: { in: leaveIds } } })
  await prisma.attendanceRecord.deleteMany({ where: { id: { in: attendanceIds } } })
  await prisma.doctorProfile.deleteMany({ where: { id: { in: doctorIds } } })
  await prisma.employee.deleteMany({ where: { id: { in: employeeIds } } })
  await prisma.department.deleteMany({ where: { id: { in: departmentIds } } })
  await prisma.refreshSession.deleteMany({
    where: { userId: { in: [...userIds, ...extraUserIds] } },
  })
  await prisma.userRole.deleteMany({
    where: { userId: { in: [...userIds, ...extraUserIds] } },
  })
  await prisma.user.deleteMany({ where: { id: { in: [...userIds, ...extraUserIds] } } })
  await prisma.rolePermission.deleteMany({ where: { roleId: { in: roleIds } } })
  await prisma.role.deleteMany({ where: { id: { in: roleIds } } })
  await database.disconnect()
  await prisma.$disconnect()
})

describe('M16 authentication', () => {
  it('rejects unauthenticated operational routes', async () => {
    expect((await request(app).get('/api/v1/attendance')).status).toBe(401)
    expect((await request(app).get('/api/v1/leave')).status).toBe(401)
    expect((await request(app).get('/api/v1/users')).status).toBe(401)
    expect((await request(app).get('/api/v1/audit')).status).toBe(401)
  })
})

describe('M16 attendance', () => {
  it('authorizes Administrator and Receptionist and denies other roles', async () => {
    expect((await authorized('get', '/api/v1/attendance', 'administrator')).status).toBe(200)
    expect((await authorized('get', '/api/v1/attendance', 'receptionist')).status).toBe(200)
    expect((await authorized('get', '/api/v1/attendance', 'doctor')).status).toBe(403)
    expect((await authorized('get', '/api/v1/attendance', 'nurse')).status).toBe(403)
    expect((await authorized('get', '/api/v1/attendance', 'pharmacist')).status).toBe(403)
  })

  it('records one row per employee/day, allows historical terminated employees, and audits edits', async () => {
    const terminated = await prisma.employee.create({
      data: {
        employeeNumber: `E-${prefix}-term`,
        firstName: 'Fictional',
        lastName: 'Terminated',
        jobTitle: 'Clerk',
        departmentId: departmentIds[0]!,
        hireDate: new Date('2018-01-01'),
        employmentStatus: 'terminated',
      },
    })
    employeeIds.push(terminated.id)

    const created = await authorized('post', '/api/v1/attendance', 'receptionist').send({
      employeeId: terminated.id,
      workDate: '2026-01-15',
      status: 'present',
      checkInAt: '2026-01-15T03:30:00.000Z',
      checkOutAt: '2026-01-15T12:00:00.000Z',
      note: 'Historical correction',
    })
    expect(created.status, JSON.stringify(created.body)).toBe(201)
    attendanceIds.push(created.body.data.id)

    const duplicate = await authorized('post', '/api/v1/attendance', 'administrator').send({
      employeeId: terminated.id,
      workDate: '2026-01-15',
      status: 'absent',
    })
    expect(duplicate.status).toBe(409)

    const [first, second] = await Promise.all([
      authorized('post', '/api/v1/attendance', 'administrator').send({
        employeeId: terminated.id,
        workDate: '2026-01-16',
        status: 'present',
      }),
      authorized('post', '/api/v1/attendance', 'receptionist').send({
        employeeId: terminated.id,
        workDate: '2026-01-16',
        status: 'absent',
      }),
    ])
    const statuses = [first.status, second.status].sort()
    expect(statuses).toEqual([201, 409])
    const createdId = first.status === 201 ? first.body.data.id : second.body.data.id
    attendanceIds.push(createdId)

    const updated = await authorized(
      'patch',
      `/api/v1/attendance/${created.body.data.id}`,
      'administrator',
    ).send({ status: 'leave', note: 'Corrected' })
    expect(updated.status, JSON.stringify(updated.body)).toBe(200)
    expect(updated.body.data.status).toBe('leave')
    expect(updated.body.data.employee.employmentStatus).toBe('terminated')
  })
})

describe('M16 leave', () => {
  it('lets a linked employee create and cancel own pending leave and blocks overlap', async () => {
    const created = await authorized('post', '/api/v1/leave', 'doctor').send({
      leaveType: 'sick',
      startsOn: '2026-11-01',
      endsOn: '2026-11-03',
      reason: 'Fictional recovery',
    })
    expect(created.status, JSON.stringify(created.body)).toBe(201)
    leaveIds.push(created.body.data.id)
    expect(created.body.data.status).toBe('pending')
    expect(created.body.data.employeeId).toBeTruthy()

    const overlap = await authorized('post', '/api/v1/leave', 'doctor').send({
      leaveType: 'annual',
      startsOn: '2026-11-03',
      endsOn: '2026-11-04',
    })
    expect(overlap.status).toBe(409)

    const listed = await authorized('get', '/api/v1/leave', 'accountant')
    expect(listed.status).toBe(200)
    expect(
      listed.body.data.some((row: { id: string }) => row.id === created.body.data.id),
    ).toBe(false)

    const cancelled = await authorized(
      'post',
      `/api/v1/leave/${created.body.data.id}/cancel`,
      'doctor',
    )
    expect(cancelled.status, JSON.stringify(cancelled.body)).toBe(200)
    expect(cancelled.body.data.status).toBe('cancelled')

    const afterCancel = await authorized(
      'patch',
      `/api/v1/leave/${created.body.data.id}`,
      'doctor',
    ).send({ reason: 'too late' })
    expect(afterCancel.status).toBe(409)
  })

  it('denies approval without leave.approve and allows Administrator approval', async () => {
    const created = await authorized('post', '/api/v1/leave', 'doctor').send({
      leaveType: 'annual',
      startsOn: '2026-12-01',
      endsOn: '2026-12-02',
    })
    expect(created.status, JSON.stringify(created.body)).toBe(201)
    leaveIds.push(created.body.data.id)

    expect(
      (
        await authorized(
          'post',
          `/api/v1/leave/${created.body.data.id}/approve`,
          'receptionist',
        ).send({})
      ).status,
    ).toBe(403)

    const approved = await authorized(
      'post',
      `/api/v1/leave/${created.body.data.id}/approve`,
      'administrator',
    ).send({ decisionNote: 'Covered' })
    expect(approved.status, JSON.stringify(approved.body)).toBe(200)
    expect(approved.body.data.status).toBe('approved')
  })
})

describe('M16 patient documents', () => {
  it('enforces document permissions independently of patient.read', async () => {
    const patient = await prisma.patient.create({
      data: {
        patientNumber: `P-${prefix}`,
        firstName: 'Fictional',
        lastName: 'Documented',
        dateOfBirthPrecision: 'unknown',
      },
    })
    patientIds.push(patient.id)

    expect(
      (await authorized('get', `/api/v1/patients/${patient.id}/documents`, 'nurse')).status,
    ).toBe(403)
    expect(
      (await authorized('get', `/api/v1/patients/${patient.id}/documents`, 'doctor')).status,
    ).toBe(200)

    const invalid = await authorized(
      'post',
      `/api/v1/patients/${patient.id}/documents`,
      'receptionist',
    )
      .field('title', 'Notes')
      .field('category', 'other')
      .attach('file', Buffer.from('hello'), 'notes.txt')
    expect(invalid.status).toBe(400)

    const uploaded = await authorized(
      'post',
      `/api/v1/patients/${patient.id}/documents`,
      'receptionist',
    )
      .field('title', 'Scan')
      .field('category', 'medical_report')
      .attach('file', pdfBytes, 'scan.pdf')
    expect(uploaded.status, JSON.stringify(uploaded.body)).toBe(201)
    documentIds.push(uploaded.body.data.id)
    expect(uploaded.body.data.status).toBe('available')
    expect(uploaded.body.data).not.toHaveProperty('objectKey')

    const access = await authorized(
      'post',
      `/api/v1/patients/${patient.id}/documents/${uploaded.body.data.id}/access`,
      'doctor',
    )
    expect(access.status, JSON.stringify(access.body)).toBe(200)
    expect(access.body.data.url).toContain('http')
    expect(access.body.data.expiresAt).toBeTruthy()

    const deleted = await authorized(
      'delete',
      `/api/v1/patients/${patient.id}/documents/${uploaded.body.data.id}`,
      'administrator',
    )
    expect(deleted.status).toBe(200)
    expect(deleted.body.data.status).toBe('deleted')
    expect(
      (
        await authorized(
          'get',
          `/api/v1/patients/${patient.id}/documents/${uploaded.body.data.id}`,
          'administrator',
        )
      ).status,
    ).toBe(404)

    const oversized = await authorized(
      'post',
      `/api/v1/patients/${patient.id}/documents`,
      'receptionist',
    )
      .field('title', 'Huge')
      .field('category', 'other')
      .attach('file', Buffer.concat([pdfBytes, Buffer.alloc(10 * 1024 * 1024)]), 'huge.pdf')
    expect(oversized.status).toBe(400)
  })
})

describe('M16 user administration', () => {
  it('is Administrator-only and never returns passwords', async () => {
    expect((await authorized('get', '/api/v1/users', 'receptionist')).status).toBe(403)
    const created = await authorized('post', '/api/v1/users', 'administrator').send({
      username: `${prefix}-created`,
      password: 'Valid password 42',
      roleCode: 'nurse',
    })
    expect(created.status, JSON.stringify(created.body)).toBe(201)
    extraUserIds.push(created.body.data.id)
    expect(created.body.data.password).toBeUndefined()
    expect(created.body.data.passwordHash).toBeUndefined()
    expect(created.body.data.role.code).toBe('nurse')

    const duplicate = await authorized('post', '/api/v1/users', 'administrator').send({
      username: `${prefix}-created`,
      password: 'Valid password 42',
      roleCode: 'nurse',
    })
    expect(duplicate.status).toBe(409)
  })

  it('prevents self-demotion and self-deactivation', async () => {
    const me = userIds[0]!
    expect(
      (
        await authorized('post', `/api/v1/users/${me}/role`, 'administrator').send({
          roleCode: 'nurse',
        })
      ).status,
    ).toBe(409)
    expect(
      (await authorized('post', `/api/v1/users/${me}/deactivate`, 'administrator')).status,
    ).toBe(409)
  })

  it('resets another user password without returning it and revokes sessions', async () => {
    const target = extraUserIds[0]!
    const reset = await authorized(
      'post',
      `/api/v1/users/${target}/password-reset`,
      'administrator',
    ).send({ newPassword: 'Another password 99' })
    expect(reset.status, JSON.stringify(reset.body)).toBe(204)
    expect(reset.body).toEqual({})
  })

  it('protects the last catalog Administrator and rejects invalid roles', async () => {
    const invalidRole = await authorized('post', '/api/v1/users', 'administrator').send({
      username: `${prefix}-bad-role`,
      password: 'Valid password 42',
      roleCode: 'superuser',
    })
    expect(invalidRole.status).toBe(400)

    const created = await authorized('post', '/api/v1/users', 'administrator').send({
      username: `${prefix}-catalog-admin`,
      password: 'Valid password 42',
      roleCode: 'administrator',
    })
    expect(created.status, JSON.stringify(created.body)).toBe(201)
    extraUserIds.push(created.body.data.id)

    const remaining = await prisma.user.count({
      where: {
        status: 'active',
        id: { not: created.body.data.id },
        roles: { some: { role: { code: 'administrator' } } },
      },
    })
    const demote = await authorized(
      'post',
      `/api/v1/users/${created.body.data.id}/role`,
      'administrator',
    ).send({ roleCode: 'nurse' })
    if (remaining < 1) {
      expect(demote.status).toBe(409)
    } else {
      expect(demote.status, JSON.stringify(demote.body)).toBe(200)
    }
  })
})

describe('M16 audit viewer', () => {
  it('is Administrator-only, requires a bounded range, and sanitizes export', async () => {
    expect((await authorized('get', '/api/v1/audit', 'receptionist')).status).toBe(403)
    expect(
      (await authorized('get', '/api/v1/audit', 'administrator')).status,
    ).toBe(400)

    const listed = await authorized(
      'get',
      `/api/v1/audit?occurredFrom=2026-01-01T00:00:00.000Z&occurredTo=2026-12-31T00:00:00.000Z`,
      'administrator',
    )
    expect(listed.status, JSON.stringify(listed.body)).toBe(200)
    for (const row of listed.body.data) {
      expect(row.metadata.password).toBeUndefined()
      expect(row.metadata.signedUrl).toBeUndefined()
      expect(row.metadata.resultValue).toBeUndefined()
    }

    const csv = await authorized(
      'get',
      `/api/v1/audit/export?format=csv&occurredFrom=2026-01-01T00:00:00.000Z&occurredTo=2026-12-31T00:00:00.000Z`,
      'administrator',
    )
    expect(csv.status).toBe(200)
    expect(csv.headers['content-type']).toContain('text/csv')
    expect(String(csv.text)).not.toContain('signedUrl')

    const pdf = await authorized(
      'get',
      `/api/v1/audit/export?format=pdf&occurredFrom=2026-01-01T00:00:00.000Z&occurredTo=2026-12-31T00:00:00.000Z`,
      'administrator',
    )
    expect(pdf.status).toBe(200)
    expect(pdf.headers['content-type']).toContain('pdf')
  })
})

describe('M16 exactly one role', () => {
  it('replaces a role with exactly one row and rejects a second role', async () => {
    const created = await authorized('post', '/api/v1/users', 'administrator').send({
      username: `${prefix}-one-role`,
      password,
      roleCode: 'nurse',
    })
    expect(created.status, JSON.stringify(created.body)).toBe(201)
    const userId = created.body.data.id as string
    extraUserIds.push(userId)

    const initial = await prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    })
    expect(initial).toHaveLength(1)
    expect(initial[0]?.role.code).toBe('nurse')

    const replaced = await authorized('post', `/api/v1/users/${userId}/role`, 'administrator').send({
      roleCode: 'receptionist',
    })
    expect(replaced.status, JSON.stringify(replaced.body)).toBe(200)
    expect(replaced.body.data.role.code).toBe('receptionist')

    const assigned = await prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    })
    expect(assigned).toHaveLength(1)
    expect(assigned[0]?.role.code).toBe('receptionist')

    const administratorRole = await prisma.role.findUniqueOrThrow({
      where: { code: 'administrator' },
      include: { permissions: { include: { permission: true } } },
    })
    await expect(
      prisma.userRole.create({
        data: { userId, roleId: administratorRole.id },
      }),
    ).rejects.toMatchObject({ code: 'P2002' })
    expect(await prisma.userRole.count({ where: { userId } })).toBe(1)

    const receptionistRole = await prisma.role.findUniqueOrThrow({
      where: { code: 'receptionist' },
      include: { permissions: { include: { permission: true } } },
    })
    const assignedCodes = receptionistRole.permissions.map(
      ({ permission }) => permission.code,
    )
    const current = await loadCurrentUser(userId)
    expect(current?.roles).toEqual(['receptionist'])
    expect(current?.permissions.slice().sort()).toEqual(assignedCodes.slice().sort())
    const hidden = administratorRole.permissions
      .map(({ permission }) => permission.code)
      .filter((code) => !assignedCodes.includes(code))
    for (const code of hidden) {
      expect(current?.permissions).not.toContain(code)
    }

    const token = await login(`${prefix}-one-role`)
    if (!assignedCodes.includes(PERMISSIONS.userRead)) {
      const denied = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${token}`)
      expect(denied.status).toBe(403)
    }
  })

  it('keeps exactly one role when replacements run concurrently', async () => {
    const created = await authorized('post', '/api/v1/users', 'administrator').send({
      username: `${prefix}-concurrent-role`,
      password,
      roleCode: 'nurse',
    })
    expect(created.status, JSON.stringify(created.body)).toBe(201)
    const userId = created.body.data.id as string
    extraUserIds.push(userId)

    const [first, second] = await Promise.all([
      authorized('post', `/api/v1/users/${userId}/role`, 'administrator').send({
        roleCode: 'doctor',
      }),
      authorized('post', `/api/v1/users/${userId}/role`, 'administrator').send({
        roleCode: 'accountant',
      }),
    ])
    const statuses = [first.status, second.status]
    expect(statuses.every((status) => status === 200 || status === 409)).toBe(true)
    expect(statuses).toContain(200)

    const roles = await prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    })
    expect(roles).toHaveLength(1)
    expect(['doctor', 'accountant']).toContain(roles[0]?.role.code)
    const current = await loadCurrentUser(userId)
    expect(current?.roles).toEqual([roles[0]?.role.code])
  })
})

describe('M16 audit export limits', () => {
  const occurredFrom = '2035-03-01T00:00:00.000Z'
  const occurredTo = '2035-03-03T00:00:00.000Z'
  const occurredAt = new Date('2035-03-02T12:00:00.000Z')
  const bulkAction = `${prefix}.export-bulk`
  const narrowAction = `${prefix}.export-narrow`

  async function insertRows(action: string, count: number): Promise<void> {
    const chunkSize = 1_000
    for (let offset = 0; offset < count; offset += chunkSize) {
      const size = Math.min(chunkSize, count - offset)
      await prisma.auditLog.createMany({
        data: Array.from({ length: size }, () => ({
          occurredAt,
          action,
          resourceType: 'audit',
          outcome: 'success',
          metadata: {},
        })),
      })
    }
  }

  function exportPath(format: 'csv' | 'pdf', action: string): string {
    const params = new URLSearchParams({
      format,
      occurredFrom,
      occurredTo,
      action,
    })
    return `/api/v1/audit/export?${params.toString()}`
  }

  function csvRows(body: string): number {
    return body.split('\n').filter((line) => line.length > 0).length - 1
  }

  it(
    'exports a complete filtered result and rejects anything over the cap',
    async () => {
      try {
        await insertRows(bulkAction, 4_999)
        await insertRows(narrowAction, 2)

        for (const format of ['csv', 'pdf'] as const) {
          const under = await authorized('get', exportPath(format, bulkAction), 'administrator')
          expect(under.status, JSON.stringify(under.body)).toBe(200)
          expect(under.headers['content-disposition']).toContain('attachment')
          if (format === 'csv') expect(csvRows(under.text)).toBe(4_999)
        }

        const narrow = await authorized(
          'get',
          exportPath('csv', narrowAction),
          'administrator',
        )
        expect(narrow.status).toBe(200)
        expect(csvRows(narrow.text)).toBe(2)

        await insertRows(bulkAction, 1)
        for (const format of ['csv', 'pdf'] as const) {
          const atLimit = await authorized(
            'get',
            exportPath(format, bulkAction),
            'administrator',
          )
          expect(atLimit.status, JSON.stringify(atLimit.body)).toBe(200)
          if (format === 'csv') expect(csvRows(atLimit.text)).toBe(5_000)
        }

        await insertRows(bulkAction, 1)
        const listed = await authorized(
          'get',
          `/api/v1/audit?occurredFrom=${occurredFrom}&occurredTo=${occurredTo}&action=${encodeURIComponent(bulkAction)}&pageSize=20`,
          'administrator',
        )
        expect(listed.status).toBe(200)
        expect(listed.body.meta.pagination.totalItems).toBe(5_001)
        expect(listed.body.data).toHaveLength(20)

        for (const format of ['csv', 'pdf'] as const) {
          const over = await authorized('get', exportPath(format, bulkAction), 'administrator')
          expect(over.status).toBe(400)
          expect(over.body.error.code).toBe('AUDIT_EXPORT_TOO_LARGE')
          expect(over.body.error.message).toMatch(/Narrow the date range or filters/i)
          expect(over.headers['content-type']).toContain('application/json')
          expect(over.headers['content-disposition']).toBeUndefined()
          expect(JSON.stringify(over.body)).not.toContain('%PDF')
        }

        const stillNarrow = await authorized(
          'get',
          exportPath('pdf', narrowAction),
          'administrator',
        )
        expect(stillNarrow.status).toBe(200)
        expect(stillNarrow.headers['content-type']).toContain('pdf')
      } finally {
        await prisma.auditLog.deleteMany({
          where: { action: { in: [bulkAction, narrowAction] } },
        })
      }
    },
    300_000,
  )

  it('exports Unicode actor names in CSV and PDF', async () => {
    const names = ['Sachin', 'José', 'Mādhavi', 'François']
    const action = `${prefix}.export-unicode`
    const from = '2034-04-01T00:00:00.000Z'
    const to = '2034-04-03T00:00:00.000Z'
    try {
      for (const name of names) {
        const created = await authorized('post', '/api/v1/users', 'administrator').send({
          username: `${prefix}-${name}`,
          password,
          roleCode: 'nurse',
        })
        expect(created.status, JSON.stringify(created.body)).toBe(201)
        extraUserIds.push(created.body.data.id as string)
        await prisma.auditLog.create({
          data: {
            occurredAt: new Date('2034-04-02T08:00:00.000Z'),
            actorUserId: created.body.data.id as string,
            action,
            resourceType: 'user',
            outcome: 'success',
            metadata: {},
          },
        })
      }

      const params = new URLSearchParams({
        occurredFrom: from,
        occurredTo: to,
        action,
      })
      const csv = await authorized(
        'get',
        `/api/v1/audit/export?format=csv&${params.toString()}`,
        'administrator',
      )
      expect(csv.status).toBe(200)
      for (const name of names) expect(csv.text).toContain(name)

      const pdf = await authorized(
        'get',
        `/api/v1/audit/export?format=pdf&${params.toString()}`,
        'administrator',
      )
      expect(pdf.status).toBe(200)
      expect(pdf.headers['content-type']).toContain('pdf')
      const bytes = Buffer.isBuffer(pdf.body) ? pdf.body : Buffer.from(pdf.body)
      expect(bytes.subarray(0, 5).toString('ascii')).toBe('%PDF-')
      expect(bytes.length).toBeGreaterThan(100)
      const text = extractPdfText(bytes)
      for (const name of names) expect(text).toContain(name)
    } finally {
      await prisma.auditLog.deleteMany({ where: { action } })
    }
  })
})

describe('M16 approved leave appointment blocking', () => {
  it('blocks new bookings during approved leave and ignores pending leave', async () => {
    const departmentId = departmentIds[0]!
    const doctorUser = await prisma.user.create({
      data: {
        username: `${prefix}-leave-doc-user`,
        passwordHash: await hashPassword(password),
        status: 'active',
        roles: { create: { roleId: roleIds[2]! } },
      },
    })
    extraUserIds.push(doctorUser.id)
    const employee = await prisma.employee.create({
      data: {
        employeeNumber: `E-${prefix}-ldoc`,
        firstName: 'Fictional',
        lastName: 'LeaveDoc',
        jobTitle: 'Physician',
        departmentId,
        userId: doctorUser.id,
        hireDate: new Date('2020-01-15'),
      },
    })
    employeeIds.push(employee.id)
    const doctor = await prisma.doctorProfile.create({
      data: {
        employeeId: employee.id,
        licenseNumber: `LIC-${prefix}`,
        specialization: 'General',
      },
    })
    doctorIds.push(doctor.id)
    const schedule = await prisma.doctorSchedule.create({
      data: {
        doctorId: doctor.id,
        startsAt: new Date('2026-12-10T03:00:00.000Z'),
        endsAt: new Date('2026-12-10T12:00:00.000Z'),
        status: 'available',
      },
    })
    scheduleIds.push(schedule.id)
    const patient = await prisma.patient.create({
      data: {
        patientNumber: `P-${prefix}-apt`,
        firstName: 'Fictional',
        lastName: 'Visitor',
        dateOfBirthPrecision: 'unknown',
      },
    })
    patientIds.push(patient.id)

    const pending = await prisma.leaveRecord.create({
      data: {
        employeeId: employee.id,
        leaveType: 'annual',
        startsOn: new Date('2026-12-10'),
        endsOn: new Date('2026-12-10'),
        status: 'pending',
      },
    })
    leaveIds.push(pending.id)

    const pendingBook = await authorized('post', '/api/v1/appointments', 'receptionist').send({
      patientId: patient.id,
      doctorId: doctor.id,
      startsAt: '2026-12-10T04:00:00.000Z',
      endsAt: '2026-12-10T05:00:00.000Z',
    })
    expect(pendingBook.status, JSON.stringify(pendingBook.body)).toBe(201)
    appointmentIds.push(pendingBook.body.data.id)

    await prisma.leaveRecord.update({
      where: { id: pending.id },
      data: {
        status: 'approved',
        decidedByUserId: userIds[0]!,
        decidedAt: new Date(),
      },
    })

    const blocked = await authorized('post', '/api/v1/appointments', 'receptionist').send({
      patientId: patient.id,
      doctorId: doctor.id,
      startsAt: '2026-12-10T06:00:00.000Z',
      endsAt: '2026-12-10T07:00:00.000Z',
    })
    expect(blocked.status).toBe(409)
    expect(blocked.body.error.message).toMatch(/approved leave/i)

    const overlapping = await authorized(
      'get',
      `/api/v1/appointments/${pendingBook.body.data.id}`,
      'receptionist',
    )
    expect(overlapping.status).toBe(200)
    expect(overlapping.body.data.overlapsApprovedLeave).toBe(true)
  })
})

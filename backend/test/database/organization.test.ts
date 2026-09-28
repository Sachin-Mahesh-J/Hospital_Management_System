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
const prefix = `org-api-${randomUUID().slice(0, 8)}`
const password = 'Valid password 42'
const roleIds: string[] = []
const userIds: string[] = []
const departmentIds: string[] = []
const employeeIds: string[] = []
const doctorIds: string[] = []
const scheduleIds: string[] = []
const tokens = new Map<string, string>()

const roleMatrix = {
  administrator: [
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
  ],
  receptionist: [
    PERMISSIONS.departmentRead,
    PERMISSIONS.doctorRead,
    PERMISSIONS.doctorScheduleRead,
  ],
  doctor: [PERMISSIONS.doctorRead, PERMISSIONS.doctorScheduleRead],
  nurse: [],
  laboratory_staff: [],
  pharmacist: [],
  accountant: [],
} as const

function assertSafeTestTarget(): void {
  if (process.env.HMS_DATABASE_TESTS !== 'true' || !process.env.DATABASE_URL) {
    throw new Error('Organization database tests require the guarded database runner.')
  }
  const url = new URL(process.env.DATABASE_URL)
  if (
    !['localhost', '127.0.0.1', '::1'].includes(url.hostname) ||
    url.pathname.replace(/^\//, '') !== 'hms_test'
  ) {
    throw new Error('Refusing to run organization tests outside local hms_test.')
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

beforeAll(async () => {
  const permissionIds = new Map<string, string>()
  for (const code of Object.values(PERMISSIONS).filter((value) =>
    value.startsWith('department.') ||
    value.startsWith('employee.') ||
    value.startsWith('doctor.') ||
    value.startsWith('doctor_schedule.'),
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
        name: `Org API ${roleName}`,
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
        { resourceId: { in: [...departmentIds, ...employeeIds, ...doctorIds, ...scheduleIds] } },
      ],
    },
  })
  await prisma.refreshSession.deleteMany({ where: { userId: { in: userIds } } })
  await prisma.doctorSchedule.deleteMany({ where: { id: { in: scheduleIds } } })
  await prisma.doctorProfile.deleteMany({ where: { id: { in: doctorIds } } })
  await prisma.employee.deleteMany({ where: { id: { in: employeeIds } } })
  await prisma.department.deleteMany({ where: { id: { in: departmentIds } } })
  await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } })
  await prisma.user.deleteMany({ where: { id: { in: userIds } } })
  await prisma.rolePermission.deleteMany({ where: { roleId: { in: roleIds } } })
  await prisma.role.deleteMany({ where: { id: { in: roleIds } } })
  await database.disconnect()
  await prisma.$disconnect()
})

describe('department API', () => {
  it.each([
    ['administrator', 200],
    ['receptionist', 200],
    ['doctor', 403],
    ['nurse', 403],
    ['laboratory_staff', 403],
    ['pharmacist', 403],
    ['accountant', 403],
  ])('enforces department.read for %s', async (role, expected) => {
    expect((await authorized('get', '/api/v1/departments', role)).status).toBe(
      expected,
    )
  })

  it.each([
    ['administrator', 201],
    ['receptionist', 403],
    ['doctor', 403],
    ['nurse', 403],
    ['laboratory_staff', 403],
    ['pharmacist', 403],
    ['accountant', 403],
  ])('enforces department.create for %s', async (role, expected) => {
    const response = await authorized('post', '/api/v1/departments', role).send({
      code: `${prefix}-${role}`.slice(0, 30),
      name: `${prefix} ${role}`,
    })
    expect(response.status).toBe(expected)
    if (response.status === 201) departmentIds.push(response.body.data.id)
  })

  it('creates, lists, filters, updates, and deactivates departments', async () => {
    const created = await authorized('post', '/api/v1/departments', 'administrator')
      .send({
        code: `${prefix}-CARD`,
        name: `${prefix} Cardiology`,
        description: 'Fictional cardiology department',
      })
    expect(created.status).toBe(201)
    departmentIds.push(created.body.data.id)
    expect(created.body.data.status).toBe('active')

    const id = created.body.data.id as string
    expect(
      (await authorized('get', `/api/v1/departments/${id}`, 'receptionist')).body.data,
    ).toMatchObject({ id, code: `${prefix}-CARD` })

    const updated = await authorized(
      'patch',
      `/api/v1/departments/${id}`,
      'administrator',
    ).send({ status: 'inactive' })
    expect(updated.status).toBe(200)
    expect(updated.body.data.status).toBe('inactive')

    const listed = await authorized(
      'get',
      `/api/v1/departments?search=Cardiology&status=inactive&pageSize=5`,
      'administrator',
    )
    expect(listed.status).toBe(200)
    expect(listed.body.data.some((row: { id: string }) => row.id === id)).toBe(true)

    const duplicate = await authorized('post', '/api/v1/departments', 'administrator')
      .send({ code: `${prefix}-CARD`, name: `${prefix} Other` })
    expect(duplicate.status).toBe(409)
    expect(duplicate.body.error.code).toBe('RESOURCE_CONFLICT')
    expect(JSON.stringify(duplicate.body)).not.toContain('Prisma')

    const deleted = await request(app)
      .delete(`/api/v1/departments/${id}`)
      .set('Authorization', `Bearer ${tokens.get('administrator')}`)
    expect(deleted.status).toBe(404)

    const audit = await prisma.auditLog.findMany({ where: { resourceId: id } })
    expect(audit.map((entry) => entry.action)).toEqual(
      expect.arrayContaining(['department.create', 'department.status_update']),
    )
  })

  it('rejects invalid sort expressions and unknown status values', async () => {
    expect(
      (await authorized('get', '/api/v1/departments?sortBy=passwordHash', 'administrator')).status,
    ).toBe(400)
    expect(
      (
        await authorized('post', '/api/v1/departments', 'administrator').send({
          code: `${prefix}-BAD`,
          name: `${prefix} Bad`,
          status: 'archived',
        })
      ).status,
    ).toBe(400)
  })
})

describe('employee API', () => {
  let activeDepartmentId = ''
  let inactiveDepartmentId = ''

  beforeAll(async () => {
    const active = await authorized('post', '/api/v1/departments', 'administrator')
      .send({ code: `${prefix}-ACT`, name: `${prefix} Active Dept` })
    const inactive = await authorized('post', '/api/v1/departments', 'administrator')
      .send({
        code: `${prefix}-INA`,
        name: `${prefix} Inactive Dept`,
        status: 'inactive',
      })
    expect(active.status).toBe(201)
    expect(inactive.status).toBe(201)
    activeDepartmentId = active.body.data.id
    inactiveDepartmentId = inactive.body.data.id
    departmentIds.push(activeDepartmentId, inactiveDepartmentId)
  })

  it.each([
    ['administrator', 200],
    ['receptionist', 403],
    ['doctor', 403],
    ['nurse', 403],
    ['laboratory_staff', 403],
    ['pharmacist', 403],
    ['accountant', 403],
  ])('enforces employee.read for %s', async (role, expected) => {
    expect((await authorized('get', '/api/v1/employees', role)).status).toBe(
      expected,
    )
  })

  it.each([
    ['administrator', 201],
    ['receptionist', 403],
    ['doctor', 403],
    ['nurse', 403],
    ['laboratory_staff', 403],
    ['pharmacist', 403],
    ['accountant', 403],
  ])('enforces employee.create for %s', async (role, expected) => {
    const response = await authorized('post', '/api/v1/employees', role).send({
      firstName: 'Fictional',
      lastName: role,
      jobTitle: 'Staff',
      departmentId: activeDepartmentId,
      hireDate: '2024-02-01',
    })
    expect(response.status).toBe(expected)
    if (response.status === 201) employeeIds.push(response.body.data.id)
  })

  it('creates, searches, filters, and updates employees without deletion', async () => {
    const created = await authorized('post', '/api/v1/employees', 'administrator')
      .send({
        firstName: 'Fictional',
        lastName: 'Clinician',
        jobTitle: 'Physician',
        departmentId: activeDepartmentId,
        hireDate: '2023-05-01',
        email: `staff-${randomUUID()}@example.test`,
        phone: '555-0201',
      })
    expect(created.status).toBe(201)
    employeeIds.push(created.body.data.id)
    expect(created.body.data.employeeNumber).toMatch(/^E-[0-9a-f-]{36}$/)
    expect(created.body.data.department.id).toBe(activeDepartmentId)

    const id = created.body.data.id as string
    const secondDepartment = await authorized(
      'post',
      '/api/v1/departments',
      'administrator',
    ).send({ code: `${prefix}-SEC`, name: `${prefix} Second Dept` })
    expect(secondDepartment.status).toBe(201)
    departmentIds.push(secondDepartment.body.data.id)

    const updated = await authorized(
      'patch',
      `/api/v1/employees/${id}`,
      'administrator',
    ).send({
      departmentId: secondDepartment.body.data.id,
      employmentStatus: 'inactive',
    })
    expect(updated.status).toBe(200)
    expect(updated.body.data).toMatchObject({
      departmentId: secondDepartment.body.data.id,
      employmentStatus: 'inactive',
    })

    const listed = await authorized(
      'get',
      `/api/v1/employees?search=Clinician&employmentStatus=inactive&departmentId=${secondDepartment.body.data.id}`,
      'administrator',
    )
    expect(listed.status).toBe(200)
    expect(listed.body.data).toHaveLength(1)

    const audit = await prisma.auditLog.findMany({ where: { resourceId: id } })
    expect(audit.map((entry) => entry.action)).toEqual(
      expect.arrayContaining(['employee.create', 'employee.status_update']),
    )
    expect(JSON.stringify(audit)).not.toContain('@example.test')

    const deleted = await request(app)
      .delete(`/api/v1/employees/${id}`)
      .set('Authorization', `Bearer ${tokens.get('administrator')}`)
    expect(deleted.status).toBe(404)
  })

  it('rejects invalid departments, inactive assignment, and mass assignment', async () => {
    expect(
      (
        await authorized('post', '/api/v1/employees', 'administrator').send({
          firstName: 'Fictional',
          lastName: 'InvalidDept',
          jobTitle: 'Staff',
          departmentId: randomUUID(),
          hireDate: '2024-01-01',
        })
      ).status,
    ).toBe(400)

    expect(
      (
        await authorized('post', '/api/v1/employees', 'administrator').send({
          firstName: 'Fictional',
          lastName: 'InactiveDept',
          jobTitle: 'Staff',
          departmentId: inactiveDepartmentId,
          hireDate: '2024-01-01',
        })
      ).status,
    ).toBe(400)

    const created = await authorized('post', '/api/v1/employees', 'administrator')
      .send({
        firstName: 'Fictional',
        lastName: 'NumberLock',
        jobTitle: 'Staff',
        departmentId: activeDepartmentId,
        hireDate: '2024-01-01',
      })
    expect(created.status).toBe(201)
    employeeIds.push(created.body.data.id)
    expect(
      (
        await authorized(
          'patch',
          `/api/v1/employees/${created.body.data.id}`,
          'administrator',
        ).send({ employeeNumber: 'MANUAL-1' })
      ).status,
    ).toBe(400)

    await expect(
      prisma.employee.create({
        data: {
          employeeNumber: created.body.data.employeeNumber,
          firstName: 'Collision',
          lastName: 'Check',
          jobTitle: 'Staff',
          departmentId: activeDepartmentId,
          hireDate: new Date('2024-01-01T00:00:00.000Z'),
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' })
  })

  it('links at most one employee to an existing user', async () => {
    const linkUser = await prisma.user.create({
      data: {
        username: `${prefix}-link-user`,
        passwordHash: await hashPassword(password),
        status: 'active',
      },
    })
    userIds.push(linkUser.id)

    const first = await authorized('post', '/api/v1/employees', 'administrator')
      .send({
        firstName: 'Linked',
        lastName: 'One',
        jobTitle: 'Staff',
        departmentId: activeDepartmentId,
        hireDate: '2024-01-01',
        userId: linkUser.id,
      })
    expect(first.status).toBe(201)
    employeeIds.push(first.body.data.id)

    const second = await authorized('post', '/api/v1/employees', 'administrator')
      .send({
        firstName: 'Linked',
        lastName: 'Two',
        jobTitle: 'Staff',
        departmentId: activeDepartmentId,
        hireDate: '2024-01-01',
        userId: linkUser.id,
      })
    expect(second.status).toBe(409)

    const missingUser = await authorized(
      'post',
      '/api/v1/employees',
      'administrator',
    ).send({
      firstName: 'Missing',
      lastName: 'User',
      jobTitle: 'Staff',
      departmentId: activeDepartmentId,
      hireDate: '2024-01-01',
      userId: randomUUID(),
    })
    expect(missingUser.status).toBe(400)
  })
})

describe('doctor and schedule API', () => {
  let departmentId = ''
  let employeeId = ''
  let secondEmployeeId = ''
  let doctorId = ''

  beforeAll(async () => {
    const department = await authorized(
      'post',
      '/api/v1/departments',
      'administrator',
    ).send({ code: `${prefix}-DOC`, name: `${prefix} Doctoring` })
    expect(department.status).toBe(201)
    departmentId = department.body.data.id
    departmentIds.push(departmentId)

    const employee = await authorized('post', '/api/v1/employees', 'administrator')
      .send({
        firstName: 'Fictional',
        lastName: 'Doctorable',
        jobTitle: 'Physician',
        departmentId,
        hireDate: '2022-03-01',
      })
    const second = await authorized('post', '/api/v1/employees', 'administrator')
      .send({
        firstName: 'Second',
        lastName: 'Doctorable',
        jobTitle: 'Physician',
        departmentId,
        hireDate: '2022-04-01',
      })
    expect(employee.status).toBe(201)
    expect(second.status).toBe(201)
    employeeId = employee.body.data.id
    secondEmployeeId = second.body.data.id
    employeeIds.push(employeeId, secondEmployeeId)
  })

  it.each([
    ['administrator', 200],
    ['receptionist', 200],
    ['doctor', 200],
    ['nurse', 403],
    ['laboratory_staff', 403],
    ['pharmacist', 403],
    ['accountant', 403],
  ])('enforces doctor.read for %s', async (role, expected) => {
    expect((await authorized('get', '/api/v1/doctors', role)).status).toBe(
      expected,
    )
  })

  it.each([
    ['administrator', 201],
    ['receptionist', 403],
    ['doctor', 403],
    ['nurse', 403],
    ['laboratory_staff', 403],
    ['pharmacist', 403],
    ['accountant', 403],
  ])('enforces doctor.create for %s', async (role, expected) => {
    const response = await authorized('post', '/api/v1/doctors', role).send({
      employeeId: role === 'administrator' ? employeeId : randomUUID(),
      licenseNumber: `${prefix}-${role}`,
      specialization: 'General medicine',
    })
    expect(response.status).toBe(expected)
    if (response.status === 201) {
      doctorId = response.body.data.id
      doctorIds.push(doctorId)
    }
  })

  it('creates, gets, updates, and rejects duplicate doctor profiles', async () => {
    expect(doctorId).toBeTruthy()
    const details = await authorized('get', `/api/v1/doctors/${doctorId}`, 'doctor')
    expect(details.status).toBe(200)
    expect(details.body.data.employee.department.id).toBe(departmentId)

    const updated = await authorized(
      'patch',
      `/api/v1/doctors/${doctorId}`,
      'administrator',
    ).send({ status: 'inactive', professionalSummary: 'Fictional summary' })
    expect(updated.status).toBe(200)
    expect(updated.body.data).toMatchObject({ status: 'inactive' })

    const duplicateEmployee = await authorized(
      'post',
      '/api/v1/doctors',
      'administrator',
    ).send({
      employeeId,
      licenseNumber: `${prefix}-dup-emp`,
      specialization: 'General medicine',
    })
    expect(duplicateEmployee.status).toBe(409)

    const duplicateLicense = await authorized(
      'post',
      '/api/v1/doctors',
      'administrator',
    ).send({
      employeeId: secondEmployeeId,
      licenseNumber: `${prefix}-administrator`,
      specialization: 'General medicine',
    })
    expect(duplicateLicense.status).toBe(409)

    const missingEmployee = await authorized(
      'post',
      '/api/v1/doctors',
      'administrator',
    ).send({
      employeeId: randomUUID(),
      licenseNumber: `${prefix}-missing`,
      specialization: 'General medicine',
    })
    expect(missingEmployee.status).toBe(400)

    const listed = await authorized(
      'get',
      `/api/v1/doctors?search=Doctorable&departmentId=${departmentId}&status=inactive`,
      'receptionist',
    )
    expect(listed.status).toBe(200)
    expect(listed.body.data.some((row: { id: string }) => row.id === doctorId)).toBe(true)
  })

  it.each([
    ['administrator', 200],
    ['receptionist', 200],
    ['doctor', 200],
    ['nurse', 403],
    ['laboratory_staff', 403],
    ['pharmacist', 403],
    ['accountant', 403],
  ])('enforces doctor_schedule.read for %s', async (role, expected) => {
    expect(
      (await authorized('get', `/api/v1/doctors/${doctorId}/schedules`, role)).status,
    ).toBe(expected)
  })

  it.each([
    ['administrator', 201],
    ['receptionist', 403],
    ['doctor', 403],
    ['nurse', 403],
    ['laboratory_staff', 403],
    ['pharmacist', 403],
    ['accountant', 403],
  ])('enforces doctor_schedule.create for %s', async (role, expected) => {
    const response = await authorized(
      'post',
      `/api/v1/doctors/${doctorId}/schedules`,
      role,
    ).send({
      startsAt: '2026-10-01T09:00:00+05:30',
      endsAt: '2026-10-01T12:00:00+05:30',
      note: `Created by ${role}`,
    })
    expect(response.status).toBe(expected)
    if (response.status === 201) scheduleIds.push(response.body.data.id)
  })

  it('validates schedule intervals, updates status, and allows unresolved overlaps', async () => {
    const created = await authorized(
      'post',
      `/api/v1/doctors/${doctorId}/schedules`,
      'administrator',
    ).send({
      startsAt: '2026-10-02T09:00:00Z',
      endsAt: '2026-10-02T12:00:00Z',
    })
    expect(created.status).toBe(201)
    scheduleIds.push(created.body.data.id)
    expect(created.body.data.startsAt).toBe('2026-10-02T09:00:00.000Z')

    const invalidRange = await authorized(
      'post',
      `/api/v1/doctors/${doctorId}/schedules`,
      'administrator',
    ).send({
      startsAt: '2026-10-02T12:00:00Z',
      endsAt: '2026-10-02T09:00:00Z',
    })
    expect(invalidRange.status).toBe(400)

    const naive = await authorized(
      'post',
      `/api/v1/doctors/${doctorId}/schedules`,
      'administrator',
    ).send({
      startsAt: '2026-10-02T09:00:00',
      endsAt: '2026-10-02T12:00:00',
    })
    expect(naive.status).toBe(400)

    const overlap = await authorized(
      'post',
      `/api/v1/doctors/${doctorId}/schedules`,
      'administrator',
    ).send({
      startsAt: '2026-10-02T10:00:00Z',
      endsAt: '2026-10-02T13:00:00Z',
    })
    expect(overlap.status).toBe(201)
    scheduleIds.push(overlap.body.data.id)

    const updated = await authorized(
      'patch',
      `/api/v1/doctors/${doctorId}/schedules/${created.body.data.id}`,
      'administrator',
    ).send({ status: 'unavailable' })
    expect(updated.status).toBe(200)
    expect(updated.body.data.status).toBe('unavailable')

    const mismatched = await authorized(
      'patch',
      `/api/v1/doctors/${randomUUID()}/schedules/${created.body.data.id}`,
      'administrator',
    ).send({ note: 'stolen' })
    expect(mismatched.status).toBe(404)

    const missingDoctor = await authorized(
      'get',
      `/api/v1/doctors/${randomUUID()}/schedules`,
      'administrator',
    )
    expect(missingDoctor.status).toBe(404)

    const listed = await authorized(
      'get',
      `/api/v1/doctors/${doctorId}/schedules?status=unavailable`,
      'receptionist',
    )
    expect(listed.status).toBe(200)
    expect(listed.body.data).toHaveLength(1)
  })
})

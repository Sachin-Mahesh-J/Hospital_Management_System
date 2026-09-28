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
const prefix = `appt-api-${randomUUID().slice(0, 8)}`
const password = 'Valid password 42'
const roleIds: string[] = []
const userIds: string[] = []
const departmentIds: string[] = []
const employeeIds: string[] = []
const doctorIds: string[] = []
const scheduleIds: string[] = []
const patientIds: string[] = []
const appointmentIds: string[] = []
const tokens = new Map<string, string>()

const appointmentPermissions = [
  PERMISSIONS.appointmentRead,
  PERMISSIONS.appointmentCreate,
  PERMISSIONS.appointmentUpdate,
  PERMISSIONS.appointmentCancel,
  PERMISSIONS.appointmentReschedule,
  PERMISSIONS.appointmentStatusUpdate,
] as const

const roleMatrix = {
  administrator: [
    ...appointmentPermissions,
    PERMISSIONS.patientRead,
    PERMISSIONS.patientCreate,
    PERMISSIONS.patientUpdate,
    PERMISSIONS.departmentCreate,
    PERMISSIONS.employeeCreate,
    PERMISSIONS.employeeUpdate,
    PERMISSIONS.doctorCreate,
    PERMISSIONS.doctorUpdate,
    PERMISSIONS.doctorScheduleCreate,
  ],
  receptionist: [...appointmentPermissions],
  doctor: [],
  nurse: [],
  laboratory_staff: [],
  pharmacist: [],
  accountant: [],
} as const

function assertSafeTestTarget(): void {
  if (process.env.HMS_DATABASE_TESTS !== 'true' || !process.env.DATABASE_URL) {
    throw new Error('Appointment database tests require the guarded database runner.')
  }
  const url = new URL(process.env.DATABASE_URL)
  if (
    !['localhost', '127.0.0.1', '::1'].includes(url.hostname) ||
    url.pathname.replace(/^\//, '') !== 'hms_test'
  ) {
    throw new Error('Refusing to run appointment tests outside local hms_test.')
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

function trackAppointment(response: { status: number; body: { data?: { id?: string } } }) {
  if (response.status === 201 || response.status === 200) {
    const id = response.body.data?.id
    if (id && !appointmentIds.includes(id)) appointmentIds.push(id)
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

async function createDoctorFixture(options?: {
  status?: 'active' | 'inactive'
  employmentStatus?: 'active' | 'inactive' | 'terminated'
  schedule?: { startsAt: string; endsAt: string; status?: string }
}): Promise<{ doctorId: string; employeeId: string; scheduleId?: string }> {
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
    licenseNumber: `LIC-${suffix}`,
    specialization: 'General',
    status: options?.status ?? 'active',
  })
  expect(doctor.status, JSON.stringify(doctor.body)).toBe(201)
  doctorIds.push(doctor.body.data.id)

  let scheduleId: string | undefined
  if (options?.schedule) {
    const schedule = await authorized(
      'post',
      `/api/v1/doctors/${doctor.body.data.id}/schedules`,
      'administrator',
    ).send({
      startsAt: options.schedule.startsAt,
      endsAt: options.schedule.endsAt,
      status: options.schedule.status ?? 'available',
    })
    expect(schedule.status, JSON.stringify(schedule.body)).toBe(201)
    scheduleIds.push(schedule.body.data.id)
    scheduleId = schedule.body.data.id as string
  }

  return {
    doctorId: doctor.body.data.id as string,
    employeeId: employee.body.data.id as string,
    ...(scheduleId ? { scheduleId } : {}),
  }
}

beforeAll(async () => {
  const permissionIds = new Map<string, string>()
  const codes = Object.values(PERMISSIONS).filter(
    (value) =>
      value.startsWith('appointment.') ||
      value.startsWith('patient.') ||
      value.startsWith('department.') ||
      value.startsWith('employee.') ||
      value.startsWith('doctor.') ||
      value.startsWith('doctor_schedule.'),
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
        name: `Appointment API ${roleName}`,
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
        { resourceId: { in: [...appointmentIds, ...patientIds, ...doctorIds, ...scheduleIds, ...employeeIds, ...departmentIds] } },
      ],
    },
  })
  await prisma.refreshSession.deleteMany({ where: { userId: { in: userIds } } })
  await prisma.appointment.deleteMany({
    where: {
      id: { in: appointmentIds },
      rescheduledFromAppointmentId: { not: null },
    },
  })
  await prisma.appointment.deleteMany({ where: { id: { in: appointmentIds } } })
  await prisma.doctorSchedule.deleteMany({ where: { id: { in: scheduleIds } } })
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

describe('appointment authorization', () => {
  it.each([
    ['administrator', 200],
    ['receptionist', 200],
    ['doctor', 403],
    ['nurse', 403],
    ['laboratory_staff', 403],
    ['pharmacist', 403],
    ['accountant', 403],
  ])('enforces appointment.read for %s', async (role, expected) => {
    expect((await authorized('get', '/api/v1/appointments', role)).status).toBe(expected)
  })

  it('requires authentication', async () => {
    expect((await request(app).get('/api/v1/appointments')).status).toBe(401)
  })
})

describe('appointment booking and conflicts', () => {
  let doctorA = ''
  let doctorB = ''
  let patientA = ''
  let patientB = ''

  beforeAll(async () => {
    const first = await createDoctorFixture({
      schedule: {
        startsAt: '2030-06-01T09:00:00.000Z',
        endsAt: '2030-06-01T12:00:00.000Z',
      },
    })
    const second = await createDoctorFixture({
      schedule: {
        startsAt: '2030-06-01T09:00:00.000Z',
        endsAt: '2030-06-01T12:00:00.000Z',
      },
    })
    doctorA = first.doctorId
    doctorB = second.doctorId
    patientA = await createPatient('PatientA')
    patientB = await createPatient('PatientB')
  })

  it('creates a valid appointment inside availability', async () => {
    const response = await authorized('post', '/api/v1/appointments', 'receptionist').send({
      patientId: patientA,
      doctorId: doctorA,
      startsAt: '2030-06-01T10:00:00.000Z',
      endsAt: '2030-06-01T11:00:00.000Z',
      reason: 'Follow-up',
    })
    expect(response.status, JSON.stringify(response.body)).toBe(201)
    trackAppointment(response)
    expect(response.body.data.status).toBe('scheduled')
    expect(response.body.data.createdByUserId).toBeTruthy()
    expect(response.body.data.patient.firstName).toBe('Fictional')

    const audit = await prisma.auditLog.findMany({
      where: { resourceId: response.body.data.id },
    })
    expect(audit.map((entry) => entry.action)).toContain('appointment.create')
    expect(JSON.stringify(audit)).not.toContain('Follow-up')
  })

  it('rejects missing patient, missing doctor, inverted range, and naive timestamps', async () => {
    expect(
      (
        await authorized('post', '/api/v1/appointments', 'administrator').send({
          patientId: randomUUID(),
          doctorId: doctorA,
          startsAt: '2030-06-01T09:00:00.000Z',
          endsAt: '2030-06-01T09:30:00.000Z',
        })
      ).status,
    ).toBe(404)
    expect(
      (
        await authorized('post', '/api/v1/appointments', 'administrator').send({
          patientId: patientA,
          doctorId: randomUUID(),
          startsAt: '2030-06-01T09:00:00.000Z',
          endsAt: '2030-06-01T09:30:00.000Z',
        })
      ).status,
    ).toBe(404)
    expect(
      (
        await authorized('post', '/api/v1/appointments', 'administrator').send({
          patientId: patientA,
          doctorId: doctorA,
          startsAt: '2030-06-01T11:00:00.000Z',
          endsAt: '2030-06-01T10:00:00.000Z',
        })
      ).status,
    ).toBe(400)
    expect(
      (
        await authorized('post', '/api/v1/appointments', 'administrator').send({
          patientId: patientA,
          doctorId: doctorA,
          startsAt: '2030-06-01T09:00:00',
          endsAt: '2030-06-01T10:00:00Z',
        })
      ).status,
    ).toBe(400)
  })

  it('rejects appointments outside available doctor schedule', async () => {
    const response = await authorized('post', '/api/v1/appointments', 'administrator').send({
      patientId: patientB,
      doctorId: doctorA,
      startsAt: '2030-06-01T11:30:00.000Z',
      endsAt: '2030-06-01T12:30:00.000Z',
    })
    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('RESOURCE_CONFLICT')
    expect(JSON.stringify(response.body)).not.toContain('Prisma')
  })

  it('rejects overlapping doctor appointments and allows adjacent intervals', async () => {
    const first = await authorized('post', '/api/v1/appointments', 'administrator').send({
      patientId: patientB,
      doctorId: doctorA,
      startsAt: '2030-06-01T09:00:00.000Z',
      endsAt: '2030-06-01T10:00:00.000Z',
    })
    expect(first.status, JSON.stringify(first.body)).toBe(201)
    trackAppointment(first)

    const overlap = await authorized('post', '/api/v1/appointments', 'administrator').send({
      patientId: await createPatient('Overlap'),
      doctorId: doctorA,
      startsAt: '2030-06-01T09:30:00.000Z',
      endsAt: '2030-06-01T10:30:00.000Z',
    })
    expect(overlap.status).toBe(409)
    expect(overlap.body.error.message).toMatch(/doctor/i)
    expect(JSON.stringify(overlap.body)).not.toContain('ex_appointments')

    const adjacent = await authorized('post', '/api/v1/appointments', 'administrator').send({
      patientId: await createPatient('Adjacent'),
      doctorId: doctorB,
      startsAt: '2030-06-01T09:00:00.000Z',
      endsAt: '2030-06-01T10:00:00.000Z',
    })
    expect(adjacent.status, JSON.stringify(adjacent.body)).toBe(201)
    trackAppointment(adjacent)

    const next = await authorized('post', '/api/v1/appointments', 'administrator').send({
      patientId: await createPatient('Adjacent2'),
      doctorId: doctorB,
      startsAt: '2030-06-01T10:00:00.000Z',
      endsAt: '2030-06-01T11:00:00.000Z',
    })
    expect(next.status, JSON.stringify(next.body)).toBe(201)
    trackAppointment(next)
  })

  it('rejects overlapping patient appointments with a different doctor', async () => {
    const patient = await createPatient('Busy')
    const first = await authorized('post', '/api/v1/appointments', 'administrator').send({
      patientId: patient,
      doctorId: doctorA,
      startsAt: '2030-06-01T11:00:00.000Z',
      endsAt: '2030-06-01T11:30:00.000Z',
    })
    expect(first.status, JSON.stringify(first.body)).toBe(201)
    trackAppointment(first)

    const overlap = await authorized('post', '/api/v1/appointments', 'administrator').send({
      patientId: patient,
      doctorId: doctorB,
      startsAt: '2030-06-01T11:15:00.000Z',
      endsAt: '2030-06-01T11:45:00.000Z',
    })
    expect(overlap.status).toBe(409)
    expect(overlap.body.error.message).toMatch(/patient/i)
  })

  it('allows booking in the past when the interval is otherwise valid', async () => {
    const doctor = await createDoctorFixture({
      schedule: {
        startsAt: '2020-01-01T09:00:00.000Z',
        endsAt: '2020-01-01T12:00:00.000Z',
      },
    })
    const response = await authorized('post', '/api/v1/appointments', 'administrator').send({
      patientId: await createPatient('Past'),
      doctorId: doctor.doctorId,
      startsAt: '2020-01-01T10:00:00.000Z',
      endsAt: '2020-01-01T11:00:00.000Z',
    })
    expect(response.status, JSON.stringify(response.body)).toBe(201)
    trackAppointment(response)
  })

  it('rejects inactive doctors and inactive or terminated employees', async () => {
    const inactiveDoctor = await createDoctorFixture({
      status: 'inactive',
      schedule: {
        startsAt: '2030-07-01T09:00:00.000Z',
        endsAt: '2030-07-01T12:00:00.000Z',
      },
    })
    expect(
      (
        await authorized('post', '/api/v1/appointments', 'administrator').send({
          patientId: patientA,
          doctorId: inactiveDoctor.doctorId,
          startsAt: '2030-07-01T10:00:00.000Z',
          endsAt: '2030-07-01T11:00:00.000Z',
        })
      ).status,
    ).toBe(409)

    const terminated = await createDoctorFixture({
      employmentStatus: 'terminated',
      schedule: {
        startsAt: '2030-07-02T09:00:00.000Z',
        endsAt: '2030-07-02T12:00:00.000Z',
      },
    })
    expect(
      (
        await authorized('post', '/api/v1/appointments', 'administrator').send({
          patientId: patientA,
          doctorId: terminated.doctorId,
          startsAt: '2030-07-02T10:00:00.000Z',
          endsAt: '2030-07-02T11:00:00.000Z',
        })
      ).status,
    ).toBe(409)
  })

  it('does not reject inactive patients solely because of patient status', async () => {
    const patient = await createPatient('Inactive')
    const updated = await authorized('patch', `/api/v1/patients/${patient}`, 'administrator').send({
      status: 'inactive',
    })
    expect(updated.status).toBe(200)

    const doctor = await createDoctorFixture({
      schedule: {
        startsAt: '2030-08-01T09:00:00.000Z',
        endsAt: '2030-08-01T12:00:00.000Z',
      },
    })
    const booked = await authorized('post', '/api/v1/appointments', 'administrator').send({
      patientId: patient,
      doctorId: doctor.doctorId,
      startsAt: '2030-08-01T10:00:00.000Z',
      endsAt: '2030-08-01T11:00:00.000Z',
    })
    expect(booked.status, JSON.stringify(booked.body)).toBe(201)
    trackAppointment(booked)
  })

  it.each([
    ['doctor', 403],
    ['nurse', 403],
    ['laboratory_staff', 403],
    ['pharmacist', 403],
    ['accountant', 403],
  ])('denies appointment.create for %s', async (role, expected) => {
    expect(
      (
        await authorized('post', '/api/v1/appointments', role).send({
          patientId: patientA,
          doctorId: doctorA,
          startsAt: '2030-06-01T09:00:00.000Z',
          endsAt: '2030-06-01T09:15:00.000Z',
        })
      ).status,
    ).toBe(expected)
  })
})

describe('appointment listing, update, status, cancel, and reschedule', () => {
  let doctorId = ''
  let otherDoctorId = ''
  let patientId = ''
  let appointmentId = ''

  beforeAll(async () => {
    const first = await createDoctorFixture({
      schedule: {
        startsAt: '2031-01-15T08:00:00.000Z',
        endsAt: '2031-01-15T16:00:00.000Z',
      },
    })
    const second = await createDoctorFixture({
      schedule: {
        startsAt: '2031-01-15T08:00:00.000Z',
        endsAt: '2031-01-15T16:00:00.000Z',
      },
    })
    doctorId = first.doctorId
    otherDoctorId = second.doctorId
    patientId = await createPatient('Lifecycle')
    const created = await authorized('post', '/api/v1/appointments', 'administrator').send({
      patientId,
      doctorId,
      startsAt: '2031-01-15T09:00:00.000Z',
      endsAt: '2031-01-15T10:00:00.000Z',
      reason: 'Initial',
    })
    expect(created.status, JSON.stringify(created.body)).toBe(201)
    trackAppointment(created)
    appointmentId = created.body.data.id as string
  })

  it('lists, filters, and rejects arbitrary sort columns', async () => {
    const listed = await authorized(
      'get',
      `/api/v1/appointments?patientId=${patientId}&status=scheduled&sortBy=startsAt`,
      'receptionist',
    )
    expect(listed.status).toBe(200)
    expect(listed.body.data.some((row: { id: string }) => row.id === appointmentId)).toBe(true)
    expect(
      (await authorized('get', '/api/v1/appointments?sortBy=passwordHash', 'administrator')).status,
    ).toBe(400)
  })

  it('updates reason only and rejects status through ordinary PATCH', async () => {
    const updated = await authorized(
      'patch',
      `/api/v1/appointments/${appointmentId}`,
      'receptionist',
    ).send({ reason: 'Updated reason' })
    expect(updated.status).toBe(200)
    expect(updated.body.data.reason).toBe('Updated reason')
    expect(updated.body.data.status).toBe('scheduled')

    expect(
      (
        await authorized('patch', `/api/v1/appointments/${appointmentId}`, 'administrator').send({
          status: 'completed',
        })
      ).status,
    ).toBe(400)
  })

  it('enforces approved status transitions only', async () => {
    expect(
      (
        await authorized(
          'patch',
          `/api/v1/appointments/${appointmentId}/status`,
          'administrator',
        ).send({ status: 'completed' })
      ).status,
    ).toBe(409)

    const checkedIn = await authorized(
      'patch',
      `/api/v1/appointments/${appointmentId}/status`,
      'receptionist',
    ).send({ status: 'checked_in' })
    expect(checkedIn.status).toBe(200)
    expect(checkedIn.body.data.status).toBe('checked_in')

    expect(
      (
        await authorized(
          'patch',
          `/api/v1/appointments/${appointmentId}/status`,
          'administrator',
        ).send({ status: 'no_show' })
      ).status,
    ).toBe(409)

    const completed = await authorized(
      'patch',
      `/api/v1/appointments/${appointmentId}/status`,
      'administrator',
    ).send({ status: 'completed' })
    expect(completed.status).toBe(200)
    expect(completed.body.data.status).toBe('completed')

    expect(
      (
        await authorized(
          'patch',
          `/api/v1/appointments/${appointmentId}/status`,
          'administrator',
        ).send({ status: 'checked_in' })
      ).status,
    ).toBe(409)
    expect(
      (
        await authorized(
          'post',
          `/api/v1/appointments/${appointmentId}/cancel`,
          'administrator',
        ).send({ cancellationReason: 'Too late' })
      ).status,
    ).toBe(409)
  })

  it('cancels an eligible appointment, stores metadata, and frees the slot', async () => {
    const created = await authorized('post', '/api/v1/appointments', 'administrator').send({
      patientId: await createPatient('CancelMe'),
      doctorId,
      startsAt: '2031-01-15T11:00:00.000Z',
      endsAt: '2031-01-15T12:00:00.000Z',
    })
    expect(created.status).toBe(201)
    trackAppointment(created)
    const id = created.body.data.id as string

    expect(
      (
        await authorized('post', `/api/v1/appointments/${id}/cancel`, 'administrator').send({})
      ).status,
    ).toBe(400)

    const cancelled = await authorized(
      'post',
      `/api/v1/appointments/${id}/cancel`,
      'receptionist',
    ).send({ cancellationReason: 'Patient request' })
    expect(cancelled.status).toBe(200)
    expect(cancelled.body.data.status).toBe('cancelled')
    expect(cancelled.body.data.cancellationReason).toBe('Patient request')
    expect(cancelled.body.data.cancelledAt).toBeTruthy()
    expect(cancelled.body.data.cancelledByUserId).toBeTruthy()

    const stored = await prisma.appointment.findUnique({ where: { id } })
    expect(stored).not.toBeNull()

    const replacement = await authorized('post', '/api/v1/appointments', 'administrator').send({
      patientId: await createPatient('ReuseSlot'),
      doctorId,
      startsAt: '2031-01-15T11:00:00.000Z',
      endsAt: '2031-01-15T12:00:00.000Z',
    })
    expect(replacement.status, JSON.stringify(replacement.body)).toBe(201)
    trackAppointment(replacement)
  })

  it('reschedules transactionally and rejects ineligible replacements', async () => {
    const original = await authorized('post', '/api/v1/appointments', 'administrator').send({
      patientId,
      doctorId,
      startsAt: '2031-01-15T13:00:00.000Z',
      endsAt: '2031-01-15T14:00:00.000Z',
    })
    expect(original.status).toBe(201)
    trackAppointment(original)
    const originalId = original.body.data.id as string

    const failed = await authorized(
      'post',
      `/api/v1/appointments/${originalId}/reschedule`,
      'administrator',
    ).send({
      doctorId: otherDoctorId,
      startsAt: '2031-01-15T15:30:00.000Z',
      endsAt: '2031-01-15T16:30:00.000Z',
    })
    expect(failed.status).toBe(409)
    const unchanged = await authorized(
      'get',
      `/api/v1/appointments/${originalId}`,
      'administrator',
    )
    expect(unchanged.body.data.status).toBe('scheduled')
    expect(unchanged.body.data.startsAt).toBe('2031-01-15T13:00:00.000Z')

    const otherPatient = await createPatient('WrongPatient')
    expect(
      (
        await authorized(
          'post',
          `/api/v1/appointments/${originalId}/reschedule`,
          'administrator',
        ).send({
          patientId: otherPatient,
          doctorId: otherDoctorId,
          startsAt: '2031-01-15T14:00:00.000Z',
          endsAt: '2031-01-15T15:00:00.000Z',
        })
      ).status,
    ).toBe(409)

    const replacement = await authorized(
      'post',
      `/api/v1/appointments/${originalId}/reschedule`,
      'receptionist',
    ).send({
      doctorId: otherDoctorId,
      startsAt: '2031-01-15T14:00:00.000Z',
      endsAt: '2031-01-15T15:00:00.000Z',
      reason: 'Later slot',
    })
    expect(replacement.status, JSON.stringify(replacement.body)).toBe(200)
    trackAppointment(replacement)
    expect(replacement.body.data.id).not.toBe(originalId)
    expect(replacement.body.data.patientId).toBe(patientId)
    expect(replacement.body.data.rescheduledFromAppointmentId).toBe(originalId)
    expect(replacement.body.data.status).toBe('scheduled')

    const cancelledOriginal = await authorized(
      'get',
      `/api/v1/appointments/${originalId}`,
      'administrator',
    )
    expect(cancelledOriginal.body.data.status).toBe('cancelled')
    expect(cancelledOriginal.body.data.cancellationReason).toBe('Rescheduled')
    expect(cancelledOriginal.body.data.rescheduledTo.id).toBe(replacement.body.data.id)

    expect(
      (
        await authorized(
          'post',
          `/api/v1/appointments/${originalId}/reschedule`,
          'administrator',
        ).send({
          doctorId: otherDoctorId,
          startsAt: '2031-01-15T15:00:00.000Z',
          endsAt: '2031-01-15T15:30:00.000Z',
        })
      ).status,
    ).toBe(409)
  })

  it('denies lifecycle operations for roles without appointment permissions', async () => {
    expect(
      (
        await authorized(
          'patch',
          `/api/v1/appointments/${appointmentId}`,
          'doctor',
        ).send({ reason: 'Nope' })
      ).status,
    ).toBe(403)
    expect(
      (
        await authorized(
          'post',
          `/api/v1/appointments/${appointmentId}/cancel`,
          'nurse',
        ).send({ cancellationReason: 'Nope' })
      ).status,
    ).toBe(403)
    expect(
      (
        await authorized(
          'patch',
          `/api/v1/appointments/${appointmentId}/status`,
          'pharmacist',
        ).send({ status: 'checked_in' })
      ).status,
    ).toBe(403)
  })
})

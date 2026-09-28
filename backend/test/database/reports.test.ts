import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PERMISSIONS } from '../../src/auth/auth.constants.js'
import { ROLE_PERMISSION_CODES } from '../../src/auth/roleCatalog.js'
import { hashPassword } from '../../src/auth/password.service.js'
import { createApp } from '../../src/app.js'
import { env } from '../../src/config/env.js'
import {
  addCalendarDays,
  hospitalDateUtcRange,
  hospitalToday,
} from '../../src/config/hospitalTime.js'
import { database } from '../../src/database/database.service.js'

const prisma = new PrismaClient()
const app = createApp()
const prefix = `rep-${randomUUID().slice(0, 8)}`
const password = 'Valid password 42'
const roleIds: string[] = []
const userIds: string[] = []
const departmentIds: string[] = []
const employeeIds: string[] = []
const doctorIds: string[] = []
const patientIds: string[] = []
const appointmentIds: string[] = []
const labTestIds: string[] = []
const labRequestIds: string[] = []
const invoiceIds: string[] = []
const paymentIds: string[] = []
const medicineIds: string[] = []
const batchIds: string[] = []
const tokens = new Map<string, string>()
const userIdByRole = new Map<string, string>()
const currency = env.hospital.defaultCurrency

function assertSafeTestTarget(): void {
  if (process.env.HMS_DATABASE_TESTS !== 'true' || !process.env.DATABASE_URL) {
    throw new Error('Report database tests require the guarded database runner.')
  }
  const url = new URL(process.env.DATABASE_URL)
  if (
    !['localhost', '127.0.0.1', '::1'].includes(url.hostname) ||
    url.pathname.replace(/^\//, '') !== 'hms_test'
  ) {
    throw new Error('Refusing to run report tests outside local hms_test.')
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

beforeAll(async () => {
  await prisma.payment.deleteMany({
    where: { paymentNumber: { startsWith: 'PAY-rep-' }, reversesPaymentId: { not: null } },
  })
  await prisma.payment.deleteMany({
    where: { paymentNumber: { startsWith: 'PAY-rep-' } },
  })
  await prisma.invoice.deleteMany({
    where: { invoiceNumber: { startsWith: 'INV-rep-' } },
  })
  const permissionIds = new Map<string, string>()
  for (const code of Object.values(PERMISSIONS)) {
    const permission = await prisma.permission.upsert({
      where: { code },
      create: { code, description: `Test permission ${code}` },
      update: {},
    })
    permissionIds.set(code, permission.id)
  }

  for (const [roleName, permissions] of Object.entries(ROLE_PERMISSION_CODES)) {
    const role = await prisma.role.create({
      data: {
        code: `${prefix}-${roleName}`,
        name: `Report API ${prefix} ${roleName}`,
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
  await prisma.payment.deleteMany({
    where: { id: { in: paymentIds }, reversesPaymentId: { not: null } },
  })
  await prisma.payment.deleteMany({ where: { id: { in: paymentIds } } })
  await prisma.invoice.deleteMany({ where: { id: { in: invoiceIds } } })
  await prisma.labRequestItem.deleteMany({
    where: { labRequestId: { in: labRequestIds } },
  })
  await prisma.labRequest.deleteMany({ where: { id: { in: labRequestIds } } })
  await prisma.labTestDefinition.deleteMany({ where: { id: { in: labTestIds } } })
  await prisma.appointment.deleteMany({ where: { id: { in: appointmentIds } } })
  await prisma.stockMovement.deleteMany({
    where: { medicineBatchId: { in: batchIds } },
  })
  await prisma.medicineBatch.deleteMany({ where: { id: { in: batchIds } } })
  await prisma.medicine.deleteMany({ where: { id: { in: medicineIds } } })
  await prisma.doctorProfile.deleteMany({ where: { id: { in: doctorIds } } })
  await prisma.employee.deleteMany({ where: { id: { in: employeeIds } } })
  await prisma.department.deleteMany({ where: { id: { in: departmentIds } } })
  await prisma.patient.deleteMany({ where: { id: { in: patientIds } } })
  await prisma.auditLog.deleteMany({
    where: { actorUserId: { in: userIds } },
  })
  await prisma.refreshSession.deleteMany({ where: { userId: { in: userIds } } })
  await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } })
  await prisma.user.deleteMany({ where: { id: { in: userIds } } })
  await prisma.rolePermission.deleteMany({ where: { roleId: { in: roleIds } } })
  await prisma.role.deleteMany({ where: { id: { in: roleIds } } })
  await database.disconnect()
  await prisma.$disconnect()
})

const reportEndpoints = [
  ['/api/v1/reports/patients', 'administrator', ['doctor', 'nurse', 'receptionist', 'laboratory_staff', 'pharmacist', 'accountant']],
  ['/api/v1/reports/appointments?from=2031-03-01&to=2031-03-01', 'administrator', ['doctor', 'nurse', 'receptionist', 'laboratory_staff', 'pharmacist', 'accountant']],
  ['/api/v1/reports/revenue?from=2031-03-01&to=2031-03-01', 'accountant', ['doctor', 'nurse', 'receptionist', 'laboratory_staff', 'pharmacist']],
  ['/api/v1/reports/pharmacy', 'pharmacist', ['doctor', 'nurse', 'receptionist', 'laboratory_staff', 'accountant']],
  ['/api/v1/reports/laboratory?from=2031-03-01&to=2031-03-01', 'laboratory_staff', ['doctor', 'nurse', 'receptionist', 'pharmacist', 'accountant']],
  ['/api/v1/reports/staff', 'administrator', ['doctor', 'nurse', 'receptionist', 'laboratory_staff', 'pharmacist', 'accountant']],
] as const

describe('report authorization', () => {
  it.each(reportEndpoints)(
    'enforces dedicated report permissions for %s',
    async (path, allowedRole, forbiddenRoles) => {
      expect((await request(app).get(path)).status).toBe(401)
      expect((await authorized('get', path, allowedRole)).status).toBe(200)
      expect((await authorized('get', path, 'administrator')).status).toBe(200)
      for (const role of forbiddenRoles) {
        expect((await authorized('get', path, role)).status).toBe(403)
      }
    },
  )

  it('does not grant accountant patient, clinical, pharmacy, or appointment APIs', async () => {
    expect((await authorized('get', '/api/v1/patients', 'accountant')).status).toBe(403)
    expect((await authorized('get', '/api/v1/appointments', 'accountant')).status).toBe(403)
    expect((await authorized('get', '/api/v1/medical-records', 'accountant')).status).toBe(403)
    expect((await authorized('get', '/api/v1/lab/requests', 'accountant')).status).toBe(403)
    expect((await authorized('get', '/api/v1/pharmacy/inventory', 'accountant')).status).toBe(403)
    expect((await authorized('get', '/api/v1/reports/patients', 'accountant')).status).toBe(403)
  })

  it('rejects inverted and oversized date ranges without swapping them', async () => {
    const inverted = await authorized(
      'get',
      '/api/v1/reports/appointments?from=2031-03-02&to=2031-03-01',
      'administrator',
    )
    expect(inverted.status).toBe(400)
    const oversized = await authorized(
      'get',
      '/api/v1/reports/revenue?from=2031-01-01&to=2032-01-02',
      'accountant',
    )
    expect(oversized.status).toBe(400)
  })
})

describe('dashboard authorization', () => {
  it('requires authentication and omits unauthorized metrics', async () => {
    expect((await request(app).get('/api/v1/dashboard')).status).toBe(401)

    const admin = await authorized('get', '/api/v1/dashboard', 'administrator')
    expect(admin.status).toBe(200)
    expect(admin.body.data).toEqual(expect.objectContaining({
      hospitalDate: expect.any(String),
      currency,
      totalPatients: expect.objectContaining({ count: expect.any(Number) }),
      todaysAppointments: expect.objectContaining({ count: expect.any(Number) }),
      revenueSummary: expect.objectContaining({
        currency,
        paymentCount: expect.any(Number),
        totalAmount: expect.any(String),
      }),
      laboratoryRequests: expect.objectContaining({ count: expect.any(Number) }),
      pharmacyAlerts: expect.objectContaining({
        lowStockMedicineCount: expect.any(Number),
        nearExpiryBatchCount: expect.any(Number),
      }),
    }))

    const accountant = await authorized('get', '/api/v1/dashboard', 'accountant')
    expect(accountant.status).toBe(200)
    expect(accountant.body.data.revenueSummary).toBeDefined()
    expect(accountant.body.data.totalPatients).toBeUndefined()
    expect(accountant.body.data.todaysAppointments).toBeUndefined()
    expect(accountant.body.data.laboratoryRequests).toBeUndefined()
    expect(accountant.body.data.pharmacyAlerts).toBeUndefined()

    const lab = await authorized('get', '/api/v1/dashboard', 'laboratory_staff')
    expect(lab.body.data.laboratoryRequests).toBeDefined()
    expect(lab.body.data.revenueSummary).toBeUndefined()
    expect(lab.body.data.pharmacyAlerts).toBeUndefined()

    const pharmacist = await authorized('get', '/api/v1/dashboard', 'pharmacist')
    expect(pharmacist.body.data.pharmacyAlerts).toBeDefined()
    expect(pharmacist.body.data.revenueSummary).toBeUndefined()
    expect(pharmacist.body.data.laboratoryRequests).toBeUndefined()

    for (const role of ['doctor', 'nurse', 'receptionist'] as const) {
      const response = await authorized('get', '/api/v1/dashboard', role)
      expect(response.status).toBe(200)
      expect(response.body.data.totalPatients).toBeUndefined()
      expect(response.body.data.todaysAppointments).toBeUndefined()
      expect(response.body.data.revenueSummary).toBeUndefined()
      expect(response.body.data.laboratoryRequests).toBeUndefined()
      expect(response.body.data.pharmacyAlerts).toBeUndefined()
    }
  })
})

describe('report data and aggregations', () => {
  let patientId = ''
  let doctorId = ''
  let departmentId = ''

  beforeAll(async () => {
    const patient = await authorized('post', '/api/v1/patients', 'administrator').send({
      firstName: 'Fictional',
      lastName: `Report${prefix.slice(-4)}`,
      dateOfBirth: '1990-05-01',
      dateOfBirthPrecision: 'month',
      sexAtRegistration: 'unknown',
      phone: '555-0199',
      email: 'fictional-report@example.test',
    })
    expect(patient.status).toBe(201)
    patientId = patient.body.data.id
    patientIds.push(patientId)

    const department = await authorized('post', '/api/v1/departments', 'administrator').send({
      code: `${prefix}-dep`.slice(0, 30),
      name: `${prefix} reports`,
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
      email: 'clinician-report@example.test',
      userId: userIdByRole.get('doctor'),
    })
    expect(employee.status).toBe(201)
    employeeIds.push(employee.body.data.id)

    const doctor = await authorized('post', '/api/v1/doctors', 'administrator').send({
      employeeId: employee.body.data.id,
      licenseNumber: `LIC-${prefix}`,
      specialization: 'General',
    })
    expect(doctor.status).toBe(201)
    doctorId = doctor.body.data.id
    doctorIds.push(doctorId)
  })

  it('returns safe patient report fields and supports empty filters', async () => {
    const response = await authorized('get', '/api/v1/reports/patients?status=active', 'administrator')
    expect(response.status).toBe(200)
    const row = response.body.data.find((item: { id: string }) => item.id === patientId)
    expect(row).toEqual(expect.objectContaining({
      id: patientId,
      firstName: 'Fictional',
      status: 'active',
    }))
    expect(row).not.toHaveProperty('phone')
    expect(row).not.toHaveProperty('email')
    expect(row).not.toHaveProperty('addressText')
    expect(row).not.toHaveProperty('emergencyContactName')
    expect(row).not.toHaveProperty('passwordHash')

    const empty = await authorized(
      'get',
      '/api/v1/reports/patients?status=deceased',
      'administrator',
    )
    expect(empty.status).toBe(200)
    expect(empty.body.data).toEqual([])
    expect(empty.body.meta.pagination.totalItems).toBe(0)
  })

  it('uses hospital-local day bounds for today appointments and report ranges', async () => {
    const today = hospitalToday()
    const { start } = hospitalDateUtcRange(today)
    const included = await prisma.appointment.create({
      data: {
        patientId,
        doctorId,
        startsAt: new Date(start.getTime() + 30 * 60 * 1000),
        endsAt: new Date(start.getTime() + 60 * 60 * 1000),
        status: 'scheduled',
        createdByUserId: userIdByRole.get('administrator')!,
      },
    })
    const excluded = await prisma.appointment.create({
      data: {
        patientId,
        doctorId,
        startsAt: new Date(start.getTime() - 30 * 60 * 1000),
        endsAt: new Date(start.getTime() - 5 * 60 * 1000),
        status: 'scheduled',
        createdByUserId: userIdByRole.get('administrator')!,
      },
    })
    appointmentIds.push(included.id, excluded.id)

    const dashboard = await authorized('get', '/api/v1/dashboard', 'administrator')
    expect(dashboard.body.data.todaysAppointments.count).toBeGreaterThanOrEqual(1)
    const report = await authorized(
      'get',
      `/api/v1/reports/appointments?from=${today}&to=${today}`,
      'administrator',
    )
    const ids = report.body.data.map((row: { id: string }) => row.id)
    expect(ids).toContain(included.id)
    expect(ids).not.toContain(excluded.id)
    expect(report.body.data[0]).not.toHaveProperty('reason')
    expect(report.body.data[0].doctor.department.id).toBe(departmentId)
  })

  it('recognizes only effective non-reversed payments on non-void invoices', async () => {
    async function createInvoice(status: string, label: string) {
      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber: `INV-${prefix}-${label}`,
          patientId,
          issuedAt: new Date('2034-06-17T10:00:00.000Z'),
          currency,
          subtotal: 100,
          discountAmount: 0,
          taxAmount: 0,
          totalAmount: 100,
          amountPaid: 0,
          balanceAmount: 100,
          status,
          createdByUserId: userIdByRole.get('accountant')!,
        },
      })
      invoiceIds.push(invoice.id)
      return invoice
    }

    async function createPayment(
      invoiceId: string,
      amount: string,
      status: string,
      label: string,
      reversesPaymentId?: string,
    ) {
      const payment = await prisma.payment.create({
        data: {
          paymentNumber: `PAY-${prefix}-${label}`,
          invoiceId,
          amount,
          currency,
          method: 'cash',
          status,
          paidAt: new Date('2034-06-17T12:00:00.000Z'),
          receivedByUserId: userIdByRole.get('accountant')!,
          reversesPaymentId: reversesPaymentId ?? null,
          note: reversesPaymentId ? 'Test reversal' : null,
        },
      })
      paymentIds.push(payment.id)
      return payment
    }

    await createInvoice('issued', 'unpaid')
    const paidInvoice = await createInvoice('paid', 'paid')
    await createPayment(paidInvoice.id, '100', 'recorded', 'full')
    const partialInvoice = await createInvoice('partially_paid', 'partial')
    await createPayment(partialInvoice.id, '40', 'recorded', 'partial')
    const reversedInvoice = await createInvoice('issued', 'reversed')
    const original = await createPayment(reversedInvoice.id, '25', 'reversed', 'orig')
    await createPayment(reversedInvoice.id, '25', 'recorded', 'revrow', original.id)
    const voidInvoice = await createInvoice('void', 'voided')
    await createPayment(voidInvoice.id, '80', 'recorded', 'voidpay')

    const report = await authorized(
      'get',
      '/api/v1/reports/revenue?from=2034-06-17&to=2034-06-17',
      'accountant',
    )
    expect(report.status).toBe(200)
    expect(report.body.meta.summary.currency).toBe(currency)
    expect(Number(report.body.meta.summary.totalAmount)).toBe(140)
    expect(report.body.meta.summary.paymentCount).toBe(2)
    const numbers = report.body.data.map((row: { paymentNumber: string }) => row.paymentNumber)
    expect(numbers).toEqual(expect.arrayContaining([
      `PAY-${prefix}-full`,
      `PAY-${prefix}-partial`,
    ]))
    expect(numbers).not.toContain(`PAY-${prefix}-orig`)
    expect(numbers).not.toContain(`PAY-${prefix}-revrow`)
    expect(numbers).not.toContain(`PAY-${prefix}-voidpay`)
    expect(report.body.data[0]).not.toHaveProperty('patient')
    expect(report.body.data[0].patientNumber).toBeDefined()
  })

  it('classifies pharmacy low-stock and near-expiry using existing stock and hospital dates', async () => {
    const today = hospitalToday()
    const adminUserId = userIdByRole.get('administrator')!

    async function createMedicine(
      suffix: string,
      threshold: string,
    ) {
      const medicine = await prisma.medicine.create({
        data: {
          code: `MED-${prefix}-${suffix}`,
          genericName: `Fictional ${suffix}`,
          dosageForm: 'tablet',
          inventoryUnit: 'tablet',
          currency,
          lowStockThreshold: threshold,
          status: 'active',
        },
      })
      medicineIds.push(medicine.id)
      return medicine
    }

    async function receive(medicineId: string, expiryDate: string, quantity: string, suffix: string) {
      const batch = await prisma.medicineBatch.create({
        data: {
          medicineId,
          batchNumber: `B-${suffix}`,
          expiryDate: new Date(`${expiryDate}T00:00:00.000Z`),
          receivedQuantity: quantity,
          unitCost: 1,
          salePriceSnapshot: 1,
          currency,
          status: 'active',
        },
      })
      batchIds.push(batch.id)
      await prisma.stockMovement.create({
        data: {
          medicineBatchId: batch.id,
          movementType: 'receipt',
          quantity,
          occurredAt: new Date(),
          performedByUserId: adminUserId,
          reason: 'Report test receipt',
        },
      })
      return batch
    }

    const low = await createMedicine('LOW', '10')
    const ok = await createMedicine('OK', '10')
    const unset = await createMedicine('ZERO', '0')
    await receive(low.id, addCalendarDays(today, 90), '10', 'low')
    await receive(ok.id, addCalendarDays(today, 90), '11', 'ok')

    const near = await createMedicine('NEAR', '100')
    const outside = await createMedicine('OUT', '100')
    const expired = await createMedicine('EXP', '100')
    const nearBatch = await receive(near.id, addCalendarDays(today, 30), '5', 'near')
    const outsideBatch = await receive(outside.id, addCalendarDays(today, 31), '5', 'out')
    const expiredBatch = await receive(expired.id, addCalendarDays(today, -1), '5', 'exp')

    const lowStock = await authorized(
      'get',
      '/api/v1/reports/pharmacy?section=low_stock',
      'pharmacist',
    )
    expect(lowStock.status).toBe(200)
    const lowIds = lowStock.body.data.map((row: { id: string }) => row.id)
    expect(lowIds).toContain(low.id)
    expect(lowIds).not.toContain(ok.id)
    expect(lowIds).not.toContain(unset.id)

    const nearExpiry = await authorized(
      'get',
      '/api/v1/reports/pharmacy?section=near_expiry',
      'pharmacist',
    )
    const nearIds = nearExpiry.body.data.map((row: { id: string }) => row.id)
    expect(nearIds).toContain(nearBatch.id)
    expect(nearIds).not.toContain(outsideBatch.id)
    expect(nearIds).not.toContain(expiredBatch.id)
    expect(nearExpiry.body.meta.summary.expiredBatchCount).toBeGreaterThanOrEqual(1)
    expect(nearExpiry.body.meta.summary.nearExpiryBatchCount).toBeGreaterThanOrEqual(1)
  })

  it('returns laboratory operational fields without result values and paginates staff', async () => {
    const testDefinition = await prisma.labTestDefinition.create({
      data: {
        code: `TST-${prefix}`,
        name: `Fictional test ${prefix}`,
        status: 'active',
      },
    })
    labTestIds.push(testDefinition.id)
    const requestRow = await prisma.labRequest.create({
      data: {
        patientId,
        requestedByDoctorId: doctorId,
        requestedAt: new Date('2031-03-01T08:00:00.000Z'),
        status: 'requested',
        clinicalNote: 'Sensitive clinical note',
        items: {
          create: {
            testDefinitionId: testDefinition.id,
            status: 'requested',
          },
        },
      },
      include: { items: true },
    })
    labRequestIds.push(requestRow.id)

    const report = await authorized(
      'get',
      '/api/v1/reports/laboratory?from=2031-03-01&to=2031-03-01',
      'laboratory_staff',
    )
    expect(report.status).toBe(200)
    const row = report.body.data.find((item: { id: string }) => item.id === requestRow.id)
    expect(row.status).toBe('requested')
    expect(row.items[0].testCode).toBe(`TST-${prefix}`)
    expect(row).not.toHaveProperty('clinicalNote')
    expect(JSON.stringify(row)).not.toContain('Sensitive clinical note')

    const staff = await authorized(
      'get',
      '/api/v1/reports/staff?page=1&pageSize=1',
      'administrator',
    )
    expect(staff.status).toBe(200)
    expect(staff.body.data).toHaveLength(1)
    expect(staff.body.meta.pagination.pageSize).toBe(1)
    expect(staff.body.data[0]).not.toHaveProperty('phone')
    expect(staff.body.data[0]).not.toHaveProperty('email')
    expect(staff.body.data[0]).not.toHaveProperty('userId')
    expect(staff.body.data[0]).not.toHaveProperty('passwordHash')
  })
})

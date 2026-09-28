import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PERMISSIONS } from '../../src/auth/auth.constants.js'
import { hashPassword } from '../../src/auth/password.service.js'
import { createApp } from '../../src/app.js'
import { database } from '../../src/database/database.service.js'
import { weightedAverageUnitPrice } from '../../src/modules/billing/billing.lifecycle.js'

const prisma = new PrismaClient()
const app = createApp()
const prefix = `bill-${randomUUID().slice(0, 8)}`
const password = 'Valid password 42'
const roleIds: string[] = []
const userIds: string[] = []
const departmentIds: string[] = []
const employeeIds: string[] = []
const doctorIds: string[] = []
const patientIds: string[] = []
const appointmentIds: string[] = []
const medicalRecordIds: string[] = []
const prescriptionIds: string[] = []
const medicineIds: string[] = []
const batchIds: string[] = []
const labTestIds: string[] = []
const labRequestIds: string[] = []
const invoiceIds: string[] = []
const tokens = new Map<string, string>()
const userIdByRole = new Map<string, string>()

const billingAccountant = [
  PERMISSIONS.invoiceRead,
  PERMISSIONS.invoiceCreate,
  PERMISSIONS.invoiceUpdate,
  PERMISSIONS.invoiceIssue,
  PERMISSIONS.invoiceVoid,
  PERMISSIONS.paymentRead,
  PERMISSIONS.paymentCreate,
  PERMISSIONS.paymentReverse,
] as const

const billingAdmin = [
  PERMISSIONS.invoiceRead,
  PERMISSIONS.invoiceVoid,
  PERMISSIONS.paymentRead,
  PERMISSIONS.paymentReverse,
] as const

const roleMatrix = {
  administrator: [
    ...billingAdmin,
    PERMISSIONS.patientRead,
    PERMISSIONS.patientCreate,
    PERMISSIONS.departmentCreate,
    PERMISSIONS.employeeCreate,
    PERMISSIONS.employeeUpdate,
    PERMISSIONS.doctorCreate,
    PERMISSIONS.doctorScheduleCreate,
    PERMISSIONS.appointmentCreate,
    PERMISSIONS.appointmentStatusUpdate,
    PERMISSIONS.medicalRecordCreate,
    PERMISSIONS.medicalRecordFinalize,
    PERMISSIONS.prescriptionCreate,
    PERMISSIONS.inventoryRead,
    PERMISSIONS.stockAdjust,
    PERMISSIONS.stockMovementRead,
    PERMISSIONS.prescriptionReverse,
  ],
  receptionist: [
    PERMISSIONS.patientRead,
    PERMISSIONS.appointmentCreate,
    PERMISSIONS.appointmentStatusUpdate,
  ],
  doctor: [
    PERMISSIONS.patientRead,
    PERMISSIONS.medicalRecordCreate,
    PERMISSIONS.medicalRecordFinalize,
    PERMISSIONS.prescriptionCreate,
    PERMISSIONS.labRequestCreate,
    PERMISSIONS.labRequestRead,
    PERMISSIONS.labTestRead,
    PERMISSIONS.medicineRead,
  ],
  nurse: [PERMISSIONS.patientRead],
  laboratory_staff: [PERMISSIONS.labRequestRead, PERMISSIONS.labSampleCollect, PERMISSIONS.labResultEnter],
  pharmacist: [
    PERMISSIONS.medicineRead,
    PERMISSIONS.inventoryRead,
    PERMISSIONS.stockReceive,
    PERMISSIONS.prescriptionRead,
    PERMISSIONS.prescriptionDispense,
    PERMISSIONS.prescriptionReverse,
  ],
  accountant: [...billingAccountant],
} as const

function assertSafeTestTarget(): void {
  if (process.env.HMS_DATABASE_TESTS !== 'true' || !process.env.DATABASE_URL) {
    throw new Error('Billing database tests require the guarded database runner.')
  }
  const url = new URL(process.env.DATABASE_URL)
  if (
    !['localhost', '127.0.0.1', '::1'].includes(url.hostname) ||
    url.pathname.replace(/^\//, '') !== 'hms_test'
  ) {
    throw new Error('Refusing to run billing tests outside local hms_test.')
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
  const permissionIds = new Map<string, string>()
  const codes = Object.values(PERMISSIONS)
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
        name: `Billing API ${prefix} ${roleName}`,
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
        { resourceId: { in: [...invoiceIds, ...patientIds] } },
      ],
    },
  })
  await prisma.refreshSession.deleteMany({ where: { userId: { in: userIds } } })
  await prisma.payment.deleteMany({
    where: { invoiceId: { in: invoiceIds }, reversesPaymentId: { not: null } },
  })
  await prisma.payment.deleteMany({ where: { invoiceId: { in: invoiceIds } } })
  await prisma.invoiceItem.deleteMany({ where: { invoiceId: { in: invoiceIds } } })
  await prisma.invoice.deleteMany({ where: { id: { in: invoiceIds } } })
  await prisma.stockMovement.deleteMany({ where: { medicineBatchId: { in: batchIds } } })
  await prisma.dispenseReversal.deleteMany({ where: { reversedByUserId: { in: userIds } } })
  const items = await prisma.prescriptionItem.findMany({
    where: { prescriptionId: { in: prescriptionIds } },
    select: { id: true },
  })
  await prisma.dispenseRecord.deleteMany({
    where: { prescriptionItemId: { in: items.map((item) => item.id) } },
  })
  await prisma.prescriptionItem.deleteMany({ where: { prescriptionId: { in: prescriptionIds } } })
  await prisma.prescription.deleteMany({ where: { id: { in: prescriptionIds } } })
  await prisma.labResult.deleteMany({
    where: { labRequestItem: { labRequestId: { in: labRequestIds } } },
  })
  await prisma.labRequestItem.deleteMany({ where: { labRequestId: { in: labRequestIds } } })
  await prisma.labRequest.deleteMany({ where: { id: { in: labRequestIds } } })
  await prisma.labTestDefinition.deleteMany({ where: { id: { in: labTestIds } } })
  await prisma.diagnosis.deleteMany({ where: { medicalRecordId: { in: medicalRecordIds } } })
  await prisma.medicalRecord.deleteMany({ where: { id: { in: medicalRecordIds } } })
  await prisma.appointment.deleteMany({ where: { id: { in: appointmentIds } } })
  await prisma.medicineBatch.deleteMany({ where: { id: { in: batchIds } } })
  await prisma.medicine.deleteMany({ where: { id: { in: medicineIds } } })
  await prisma.doctorSchedule.deleteMany({ where: { doctorId: { in: doctorIds } } })
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

describe('billing authorization', () => {
  it.each([
    ['administrator', 200],
    ['accountant', 200],
    ['doctor', 403],
    ['nurse', 403],
    ['receptionist', 403],
    ['laboratory_staff', 403],
    ['pharmacist', 403],
  ])('enforces invoice.read for %s', async (role, expected) => {
    expect((await authorized('get', '/api/v1/invoices', role)).status).toBe(expected)
  })

  it.each([
    ['accountant', 400],
    ['administrator', 403],
    ['doctor', 403],
    ['nurse', 403],
    ['receptionist', 403],
    ['laboratory_staff', 403],
    ['pharmacist', 403],
  ])('enforces invoice.create for %s', async (role, expected) => {
    expect((await authorized('post', '/api/v1/invoices', role).send({})).status).toBe(expected)
  })

  it('requires authentication', async () => {
    expect((await request(app).get('/api/v1/invoices')).status).toBe(401)
    expect((await request(app).post('/api/v1/invoices').send({})).status).toBe(401)
  })

  it('does not grant accountant general patient or clinical APIs', async () => {
    expect((await authorized('get', '/api/v1/patients', 'accountant')).status).toBe(403)
    expect((await authorized('get', '/api/v1/appointments', 'accountant')).status).toBe(403)
    expect((await authorized('get', '/api/v1/medical-records', 'accountant')).status).toBe(403)
    expect((await authorized('get', '/api/v1/prescriptions', 'accountant')).status).toBe(403)
    expect((await authorized('get', '/api/v1/lab/requests', 'accountant')).status).toBe(403)
    expect((await authorized('get', '/api/v1/pharmacy/inventory', 'accountant')).status).toBe(403)
  })
})

describe('billing invoices and payments', () => {
  let patientId = ''
  let otherPatientId = ''
  let doctorId = ''
  let doctorEmployeeId = ''
  let completedAppointmentId = ''
  let scheduledAppointmentId = ''
  let checkedInAppointmentId = ''
  let noShowAppointmentId = ''
  let billableLabItemId = ''
  let unpricedLabItemId = ''
  let requestedLabItemId = ''
  let medicineId = ''
  let medicalRecordId = ''

  beforeAll(async () => {
    const patient = await authorized('post', '/api/v1/patients', 'administrator').send({
      firstName: 'Fictional',
      lastName: `Billing${prefix.slice(-4)}`,
      dateOfBirth: '1990-05-01',
      dateOfBirthPrecision: 'month',
      sexAtRegistration: 'unknown',
    })
    expect(patient.status).toBe(201)
    patientId = patient.body.data.id
    patientIds.push(patientId)

    const other = await authorized('post', '/api/v1/patients', 'administrator').send({
      firstName: 'Other',
      lastName: `Billing${prefix.slice(-4)}`,
      dateOfBirth: '1991-05-01',
      dateOfBirthPrecision: 'month',
      sexAtRegistration: 'unknown',
    })
    expect(other.status).toBe(201)
    otherPatientId = other.body.data.id
    patientIds.push(otherPatientId)

    const department = await authorized('post', '/api/v1/departments', 'administrator').send({
      code: `${prefix}-dep`.slice(0, 30),
      name: `${prefix} billing`,
    })
    expect(department.status).toBe(201)
    departmentIds.push(department.body.data.id)

    const doctorEmployee = await authorized('post', '/api/v1/employees', 'administrator').send({
      firstName: 'Fictional',
      lastName: 'Clinician',
      jobTitle: 'Physician',
      departmentId: department.body.data.id,
      hireDate: '2020-01-15',
      userId: userIdByRole.get('doctor'),
    })
    expect(doctorEmployee.status).toBe(201)
    doctorEmployeeId = doctorEmployee.body.data.id
    employeeIds.push(doctorEmployeeId)

    const pharmacistEmployee = await authorized('post', '/api/v1/employees', 'administrator').send({
      firstName: 'Fictional',
      lastName: 'Pharmacist',
      jobTitle: 'Pharmacist',
      departmentId: department.body.data.id,
      hireDate: '2021-02-01',
      userId: userIdByRole.get('pharmacist'),
    })
    expect(pharmacistEmployee.status).toBe(201)
    employeeIds.push(pharmacistEmployee.body.data.id)

    const doctor = await authorized('post', '/api/v1/doctors', 'administrator').send({
      employeeId: doctorEmployeeId,
      licenseNumber: `LIC-${prefix}`,
      specialization: 'General',
    })
    expect(doctor.status).toBe(201)
    doctorId = doctor.body.data.id
    doctorIds.push(doctorId)

    const completed = await prisma.appointment.create({
      data: {
        patientId,
        doctorId,
        startsAt: new Date('2031-01-01T10:00:00.000Z'),
        endsAt: new Date('2031-01-01T10:30:00.000Z'),
        status: 'completed',
        createdByUserId: userIdByRole.get('administrator')!,
      },
    })
    completedAppointmentId = completed.id
    appointmentIds.push(completed.id)

    const scheduled = await prisma.appointment.create({
      data: {
        patientId,
        doctorId,
        startsAt: new Date('2031-01-02T10:00:00.000Z'),
        endsAt: new Date('2031-01-02T10:30:00.000Z'),
        status: 'scheduled',
        createdByUserId: userIdByRole.get('administrator')!,
      },
    })
    scheduledAppointmentId = scheduled.id
    appointmentIds.push(scheduled.id)

    const checkedIn = await prisma.appointment.create({
      data: {
        patientId,
        doctorId,
        startsAt: new Date('2031-02-03T10:00:00.000Z'),
        endsAt: new Date('2031-02-03T10:30:00.000Z'),
        status: 'checked_in',
        createdByUserId: userIdByRole.get('administrator')!,
      },
    })
    checkedInAppointmentId = checkedIn.id
    appointmentIds.push(checkedIn.id)
    const noShow = await prisma.appointment.create({
      data: {
        patientId,
        doctorId,
        startsAt: new Date('2031-02-04T10:00:00.000Z'),
        endsAt: new Date('2031-02-04T10:30:00.000Z'),
        status: 'no_show',
        createdByUserId: userIdByRole.get('administrator')!,
      },
    })
    noShowAppointmentId = noShow.id
    appointmentIds.push(noShow.id)

    const priced = await prisma.labTestDefinition.create({
      data: {
        code: `BILL-${prefix}-A`,
        name: `Billing priced ${prefix}`,
        price: '250.5000',
        currency: 'LKR',
        status: 'active',
      },
    })
    labTestIds.push(priced.id)
    const unpriced = await prisma.labTestDefinition.create({
      data: {
        code: `BILL-${prefix}-B`,
        name: `Billing unpriced ${prefix}`,
        status: 'active',
      },
    })
    labTestIds.push(unpriced.id)

    const requestRow = await prisma.labRequest.create({
      data: {
        patientId,
        requestedByDoctorId: doctorId,
        status: 'completed',
        items: {
          create: [
            { testDefinitionId: priced.id, status: 'completed' },
            { testDefinitionId: unpriced.id, status: 'completed' },
            { testDefinitionId: priced.id, status: 'requested' },
          ],
        },
      },
      include: { items: true },
    })
    labRequestIds.push(requestRow.id)
    billableLabItemId = requestRow.items.find((item) => item.status === 'completed' && item.testDefinitionId === priced.id)!.id
    unpricedLabItemId = requestRow.items.find((item) => item.testDefinitionId === unpriced.id)!.id
    requestedLabItemId = requestRow.items.find((item) => item.status === 'requested')!.id

    const record = await authorized('post', '/api/v1/medical-records', 'doctor').send({
      patientId,
      occurredAt: '2031-03-01T12:00:00.000Z',
      diagnoses: [{ diagnosisText: 'Fictional indication' }],
    })
    expect(record.status).toBe(201)
    medicalRecordId = record.body.data.id
    medicalRecordIds.push(medicalRecordId)
    expect(
      (await authorized('post', `/api/v1/medical-records/${medicalRecordId}/finalize`, 'doctor').send({})).status,
    ).toBe(200)

    const medicine = await prisma.medicine.create({
      data: {
        code: `MED-${prefix}`,
        genericName: 'Fictionalcillin',
        dosageForm: 'tablet',
        inventoryUnit: 'tablet',
        currency: 'LKR',
        status: 'active',
      },
    })
    medicineId = medicine.id
    medicineIds.push(medicine.id)
  })

  function trackInvoice(response: { status: number; body: { data?: { id?: string } } }) {
    const id = response.body.data?.id
    if ((response.status === 201 || response.status === 200) && id && !invoiceIds.includes(id)) {
      invoiceIds.push(id)
    }
  }

  async function createPrescription(quantity = '10') {
    const created = await authorized('post', '/api/v1/prescriptions', 'doctor').send({
      medicalRecordId,
      items: [{
        medicineId,
        dosage: '1 tablet',
        frequency: 'daily',
        duration: '10 days',
        quantityPrescribed: quantity,
        unit: 'tablet',
      }],
    })
    expect(created.status, JSON.stringify(created.body)).toBe(201)
    prescriptionIds.push(created.body.data.id)
    return created.body.data as { id: string; items: Array<{ id: string }> }
  }

  it('creates a consultation invoice with server-generated number and totals', async () => {
    const created = await authorized('post', '/api/v1/invoices', 'accountant').send({
      patientId,
      items: [{
        category: 'consultation',
        appointmentId: completedAppointmentId,
        unitPrice: '1500.50',
        lineTotal: '99999',
      }],
    })
    expect(created.status, JSON.stringify(created.body)).toBe(400)

    const ok = await authorized('post', '/api/v1/invoices', 'accountant').send({
      patientId,
      items: [{
        category: 'consultation',
        appointmentId: completedAppointmentId,
        unitPrice: '1500.50',
      }],
    })
    expect(ok.status, JSON.stringify(ok.body)).toBe(201)
    trackInvoice(ok)
    expect(ok.body.data.invoiceNumber).toMatch(/^INV-[0-9a-f-]{36}$/)
    expect(ok.body.data.status).toBe('draft')
    expect(ok.body.data.currency).toBe('LKR')
    expect(ok.body.data.taxAmount).toBe('0')
    expect(ok.body.data.discountAmount).toBe('0')
    expect(ok.body.data.totalAmount).toBe('1500.5')
    expect(ok.body.data.subtotal).toBe('1500.5')
    expect(ok.body.data.createdBy.username).toBe(`${prefix}-accountant`)
    expect(ok.body.data.patient).toEqual(expect.objectContaining({
      id: patientId,
      firstName: 'Fictional',
    }))
    expect(ok.body.data.patient.phone).toBeUndefined()
    expect(ok.body.data.items[0].lineTotal).toBe('1500.5')
  })

  it('rejects empty invoices, invalid patients, and non-completed appointments', async () => {
    expect((await authorized('post', '/api/v1/invoices', 'accountant').send({
      patientId,
      items: [],
    })).status).toBe(400)
    expect((await authorized('post', '/api/v1/invoices', 'accountant').send({
      patientId: randomUUID(),
      items: [{ category: 'consultation', appointmentId: completedAppointmentId, unitPrice: '10' }],
    })).status).toBe(404)
    expect((await authorized('post', '/api/v1/invoices', 'accountant').send({
      patientId,
      items: [{ category: 'consultation', appointmentId: scheduledAppointmentId, unitPrice: '10' }],
    })).status).toBe(409)
    expect((await authorized('post', '/api/v1/invoices', 'accountant').send({
      patientId,
      items: [{ category: 'consultation', appointmentId: checkedInAppointmentId, unitPrice: '10' }],
    })).status).toBe(409)
    expect((await authorized('post', '/api/v1/invoices', 'accountant').send({
      patientId,
      items: [{ category: 'consultation', appointmentId: noShowAppointmentId, unitPrice: '10' }],
    })).status).toBe(409)
  })

  it('creates laboratory invoices from catalog price and rejects ineligible items', async () => {
    const ok = await authorized('post', '/api/v1/invoices', 'accountant').send({
      patientId,
      items: [{ category: 'laboratory', labRequestItemId: billableLabItemId }],
    })
    expect(ok.status, JSON.stringify(ok.body)).toBe(201)
    trackInvoice(ok)
    expect(ok.body.data.items[0].unitPrice).toBe('250.5')
    expect(ok.body.data.totalAmount).toBe('250.5')

    const duplicate = await authorized('post', '/api/v1/invoices', 'accountant').send({
      patientId,
      items: [{ category: 'laboratory', labRequestItemId: billableLabItemId }],
    })
    expect(duplicate.status).toBe(409)

    expect((await authorized('post', '/api/v1/invoices', 'accountant').send({
      patientId,
      items: [{ category: 'laboratory', labRequestItemId: unpricedLabItemId }],
    })).status).toBe(409)
    expect((await authorized('post', '/api/v1/invoices', 'accountant').send({
      patientId,
      items: [{ category: 'laboratory', labRequestItemId: requestedLabItemId }],
    })).status).toBe(409)
    expect((await authorized('post', '/api/v1/invoices', 'accountant').send({
      patientId: otherPatientId,
      items: [{ category: 'laboratory', labRequestItemId: billableLabItemId }],
    })).status).toBe(409)
  })

  it('bills a multi-batch dispense using weighted-average sale price', async () => {
    const first = await authorized('post', '/api/v1/pharmacy/receipts', 'pharmacist').send({
      medicineId,
      batchNumber: `${prefix}-B1`,
      expiryDate: '2031-01-01',
      quantity: '2',
      unitCost: '5',
      salePriceSnapshot: '10',
      currency: 'LKR',
    })
    expect(first.status).toBe(201)
    batchIds.push(first.body.data.batch.id)
    const second = await authorized('post', '/api/v1/pharmacy/receipts', 'pharmacist').send({
      medicineId,
      batchNumber: `${prefix}-B2`,
      expiryDate: '2031-06-01',
      quantity: '5',
      unitCost: '6',
      salePriceSnapshot: '13',
      currency: 'LKR',
    })
    expect(second.status).toBe(201)
    batchIds.push(second.body.data.batch.id)

    const prescription = await createPrescription('3')
    const dispensed = await authorized(
      'post',
      `/api/v1/prescriptions/${prescription.id}/items/${prescription.items[0]!.id}/dispense`,
      'pharmacist',
    ).send({ quantity: '3' })
    expect(dispensed.status, JSON.stringify(dispensed.body)).toBe(200)
    const dispenseId = dispensed.body.data.items[0].dispenseRecords[0].id as string
    const expected = weightedAverageUnitPrice([
      { quantity: '2', unitPrice: '10' },
      { quantity: '1', unitPrice: '13' },
    ])

    const invoice = await authorized('post', '/api/v1/invoices', 'accountant').send({
      patientId,
      items: [{ category: 'pharmacy', dispenseRecordId: dispenseId, unitPrice: '1' }],
    })
    expect(invoice.status).toBe(400)

    const ok = await authorized('post', '/api/v1/invoices', 'accountant').send({
      patientId,
      items: [{ category: 'pharmacy', dispenseRecordId: dispenseId }],
    })
    expect(ok.status, JSON.stringify(ok.body)).toBe(201)
    trackInvoice(ok)
    expect(ok.body.data.items[0].quantity).toBe('3')
    expect(ok.body.data.items[0].unitPrice).toBe(expected.toString())
    expect(ok.body.data.totalAmount).toBe(expected.mul(3).toDecimalPlaces(4).toString())

    const duplicate = await authorized('post', '/api/v1/invoices', 'accountant').send({
      patientId,
      items: [{ category: 'pharmacy', dispenseRecordId: dispenseId }],
    })
    expect(duplicate.status).toBe(409)
  })

  it('rejects reversed dispenses and supports mixed invoices, draft edit, issue, pay, reverse, and void', async () => {
    const received = await authorized('post', '/api/v1/pharmacy/receipts', 'pharmacist').send({
      medicineId,
      batchNumber: `${prefix}-REV`,
      expiryDate: '2032-01-01',
      quantity: '4',
      unitCost: '2',
      salePriceSnapshot: '8',
      currency: 'LKR',
    })
    expect(received.status).toBe(201)
    batchIds.push(received.body.data.batch.id)
    const prescription = await createPrescription('2')
    const dispensed = await authorized(
      'post',
      `/api/v1/prescriptions/${prescription.id}/items/${prescription.items[0]!.id}/dispense`,
      'pharmacist',
    ).send({ quantity: '2' })
    expect(dispensed.status).toBe(200)
    const dispenseId = dispensed.body.data.items[0].dispenseRecords[0].id as string
    const reversed = await authorized(
      'post',
      `/api/v1/prescriptions/${prescription.id}/dispenses/${dispenseId}/reverse`,
      'pharmacist',
    ).send({ reason: 'Entered in error' })
    expect(reversed.status).toBe(200)
    expect((await authorized('post', '/api/v1/invoices', 'accountant').send({
      patientId,
      items: [{ category: 'pharmacy', dispenseRecordId: dispenseId }],
    })).status).toBe(409)

    const priced = await prisma.labTestDefinition.create({
      data: {
        code: `BILL-${prefix}-C`,
        name: `Billing mix ${prefix}`,
        price: '100',
        currency: 'LKR',
        status: 'active',
      },
    })
    labTestIds.push(priced.id)
    const labRequest = await prisma.labRequest.create({
      data: {
        patientId,
        requestedByDoctorId: doctorId,
        status: 'completed',
        items: { create: [{ testDefinitionId: priced.id, status: 'completed' }] },
      },
      include: { items: true },
    })
    labRequestIds.push(labRequest.id)
    const extraAppointment = await prisma.appointment.create({
      data: {
        patientId,
        doctorId,
        startsAt: new Date('2031-05-01T10:00:00.000Z'),
        endsAt: new Date('2031-05-01T10:30:00.000Z'),
        status: 'completed',
        createdByUserId: userIdByRole.get('administrator')!,
      },
    })
    appointmentIds.push(extraAppointment.id)

    const draft = await authorized('post', '/api/v1/invoices', 'accountant').send({
      patientId,
      items: [
        { category: 'consultation', appointmentId: extraAppointment.id, unitPrice: '200' },
        { category: 'laboratory', labRequestItemId: labRequest.items[0]!.id },
      ],
    })
    expect(draft.status, JSON.stringify(draft.body)).toBe(201)
    trackInvoice(draft)
    expect(draft.body.data.totalAmount).toBe('300')

    const patched = await authorized('patch', `/api/v1/invoices/${draft.body.data.id}`, 'accountant').send({
      items: [{ category: 'consultation', appointmentId: extraAppointment.id, unitPrice: '400' }],
    })
    expect(patched.status, JSON.stringify(patched.body)).toBe(200)
    expect(patched.body.data.totalAmount).toBe('400')
    expect(patched.body.data.status).toBe('draft')

    expect((await authorized('post', `/api/v1/invoices/${draft.body.data.id}/payments`, 'accountant').send({
      amount: '10',
      method: 'cash',
    })).status).toBe(409)

    const issued = await authorized('post', `/api/v1/invoices/${draft.body.data.id}/issue`, 'accountant').send({})
    expect(issued.status, JSON.stringify(issued.body)).toBe(200)
    expect(issued.body.data.status).toBe('issued')
    expect((await authorized('patch', `/api/v1/invoices/${draft.body.data.id}`, 'accountant').send({
      items: [{ category: 'consultation', appointmentId: extraAppointment.id, unitPrice: '1' }],
    })).status).toBe(409)

    expect((await authorized('post', `/api/v1/invoices/${draft.body.data.id}/payments`, 'accountant').send({
      amount: '0',
      method: 'cash',
    })).status).toBe(400)
    expect((await authorized('post', `/api/v1/invoices/${draft.body.data.id}/payments`, 'accountant').send({
      amount: '500',
      method: 'cash',
    })).status).toBe(409)

    const firstPay = await authorized('post', `/api/v1/invoices/${draft.body.data.id}/payments`, 'accountant').send({
      amount: '150',
      method: 'cash',
      receivedByUserId: userIdByRole.get('administrator'),
    })
    expect(firstPay.status).toBe(400)

    const partial = await authorized('post', `/api/v1/invoices/${draft.body.data.id}/payments`, 'accountant').send({
      amount: '150',
      method: 'cash',
    })
    expect(partial.status, JSON.stringify(partial.body)).toBe(201)
    expect(partial.body.data.paymentNumber).toMatch(/^PAY-[0-9a-f-]{36}$/)
    expect(partial.body.data.receivedBy.username).toBe(`${prefix}-accountant`)
    const afterPartial = await authorized('get', `/api/v1/invoices/${draft.body.data.id}`, 'accountant')
    expect(afterPartial.body.data.status).toBe('partially_paid')
    expect(afterPartial.body.data.amountPaid).toBe('150')
    expect(afterPartial.body.data.balanceAmount).toBe('250')

    expect((await authorized('post', `/api/v1/invoices/${draft.body.data.id}/void`, 'accountant').send({
      reason: 'Still has a payment',
    })).status).toBe(409)

    const rest = await authorized('post', `/api/v1/invoices/${draft.body.data.id}/payments`, 'accountant').send({
      amount: '250',
      method: 'bank_transfer',
      externalReference: 'TXN-1',
    })
    expect(rest.status).toBe(201)
    const paid = await authorized('get', `/api/v1/invoices/${draft.body.data.id}`, 'accountant')
    expect(paid.body.data.status).toBe('paid')
    expect(paid.body.data.balanceAmount).toBe('0')

    expect((await authorized('post', `/api/v1/payments/${partial.body.data.id}/reverse`, 'accountant').send({})).status).toBe(400)
    const reverse = await authorized('post', `/api/v1/payments/${partial.body.data.id}/reverse`, 'administrator').send({
      reason: 'Received on the wrong invoice',
    })
    expect(reverse.status, JSON.stringify(reverse.body)).toBe(201)
    expect(reverse.body.data.reversesPaymentId).toBe(partial.body.data.id)
    expect((await authorized('post', `/api/v1/payments/${partial.body.data.id}/reverse`, 'accountant').send({
      reason: 'Again',
    })).status).toBe(409)

    const afterReverse = await authorized('get', `/api/v1/invoices/${draft.body.data.id}`, 'accountant')
    expect(afterReverse.body.data.status).toBe('partially_paid')
    expect(afterReverse.body.data.amountPaid).toBe('250')

    const reverseRest = await authorized('post', `/api/v1/payments/${rest.body.data.id}/reverse`, 'accountant').send({
      reason: 'Full correction',
    })
    expect(reverseRest.status).toBe(201)
    const unpaid = await authorized('get', `/api/v1/invoices/${draft.body.data.id}`, 'accountant')
    expect(unpaid.body.data.status).toBe('issued')
    expect(unpaid.body.data.amountPaid).toBe('0')

    const voided = await authorized('post', `/api/v1/invoices/${draft.body.data.id}/void`, 'administrator').send({
      reason: 'Created for the wrong encounter',
    })
    expect(voided.status, JSON.stringify(voided.body)).toBe(200)
    expect(voided.body.data.status).toBe('void')
    expect((await authorized('post', `/api/v1/invoices/${draft.body.data.id}/payments`, 'accountant').send({
      amount: '10',
      method: 'card',
    })).status).toBe(409)
    expect((await authorized('patch', `/api/v1/invoices/${draft.body.data.id}`, 'accountant').send({
      items: [{ category: 'consultation', appointmentId: extraAppointment.id, unitPrice: '10' }],
    })).status).toBe(409)

    const audit = await prisma.auditLog.findFirst({
      where: { action: 'invoice.void', resourceId: draft.body.data.id },
      orderBy: { occurredAt: 'desc' },
    })
    expect(audit?.metadata).toEqual(expect.objectContaining({
      reason: 'Created for the wrong encounter',
    }))
  })

  it('rejects concurrent duplicate laboratory billing and concurrent overpayment', async () => {
    const priced = await prisma.labTestDefinition.create({
      data: {
        code: `BILL-${prefix}-D`,
        name: `Billing race ${prefix}`,
        price: '50',
        currency: 'LKR',
        status: 'active',
      },
    })
    labTestIds.push(priced.id)
    const labRequest = await prisma.labRequest.create({
      data: {
        patientId,
        requestedByDoctorId: doctorId,
        status: 'completed',
        items: { create: [{ testDefinitionId: priced.id, status: 'completed' }] },
      },
      include: { items: true },
    })
    labRequestIds.push(labRequest.id)
    const itemId = labRequest.items[0]!.id
    const [first, second] = await Promise.all([
      authorized('post', '/api/v1/invoices', 'accountant').send({
        patientId,
        items: [{ category: 'laboratory', labRequestItemId: itemId }],
      }),
      authorized('post', '/api/v1/invoices', 'accountant').send({
        patientId,
        items: [{ category: 'laboratory', labRequestItemId: itemId }],
      }),
    ])
    const statuses = [first.status, second.status].sort()
    expect(statuses).toEqual([201, 409])
    trackInvoice(first.status === 201 ? first : second)

    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        doctorId,
        startsAt: new Date('2031-06-01T10:00:00.000Z'),
        endsAt: new Date('2031-06-01T10:30:00.000Z'),
        status: 'completed',
        createdByUserId: userIdByRole.get('administrator')!,
      },
    })
    appointmentIds.push(appointment.id)
    const invoice = await authorized('post', '/api/v1/invoices', 'accountant').send({
      patientId,
      items: [{ category: 'consultation', appointmentId: appointment.id, unitPrice: '100' }],
    })
    expect(invoice.status).toBe(201)
    trackInvoice(invoice)
    expect((await authorized('post', `/api/v1/invoices/${invoice.body.data.id}/issue`, 'accountant').send({})).status).toBe(200)

    const [payA, payB] = await Promise.all([
      authorized('post', `/api/v1/invoices/${invoice.body.data.id}/payments`, 'accountant').send({
        amount: '100',
        method: 'cash',
      }),
      authorized('post', `/api/v1/invoices/${invoice.body.data.id}/payments`, 'accountant').send({
        amount: '100',
        method: 'card',
      }),
    ])
    const payStatuses = [payA.status, payB.status].sort()
    expect(payStatuses).toEqual([201, 409])
    const latest = await authorized('get', `/api/v1/invoices/${invoice.body.data.id}`, 'accountant')
    expect(latest.body.data.status).toBe('paid')
    expect(latest.body.data.amountPaid).toBe('100')
    expect(latest.body.data.balanceAmount).toBe('0')
  })

  it('lets accountants look up billing-safe patients and billable sources', async () => {
    const patients = await authorized('get', `/api/v1/billing/patients?search=${prefix.slice(-4)}`, 'accountant')
    expect(patients.status).toBe(200)
    expect(patients.body.data[0].phone).toBeUndefined()
    const consultations = await authorized('get', `/api/v1/billing/patients/${patientId}/consultations`, 'accountant')
    expect(consultations.status).toBe(200)
    expect(consultations.body.data.some((row: { appointmentId: string }) => row.appointmentId === completedAppointmentId)).toBe(true)
    expect((await authorized('get', `/api/v1/billing/patients/${patientId}/consultations`, 'doctor')).status).toBe(403)
  })
})

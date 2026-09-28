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
const prefix = `pharm-${randomUUID().slice(0, 8)}`
const password = 'Valid password 42'
const roleIds: string[] = []
const userIds: string[] = []
const departmentIds: string[] = []
const employeeIds: string[] = []
const doctorIds: string[] = []
const patientIds: string[] = []
const medicalRecordIds: string[] = []
const prescriptionIds: string[] = []
const medicineIds: string[] = []
const batchIds: string[] = []
const tokens = new Map<string, string>()
const userIdByRole = new Map<string, string>()

const pharmacyAdmin = [
  PERMISSIONS.inventoryRead,
  PERMISSIONS.stockAdjust,
  PERMISSIONS.stockMovementRead,
  PERMISSIONS.prescriptionRead,
  PERMISSIONS.prescriptionReverse,
] as const
const pharmacyPharmacist = [
  PERMISSIONS.medicineRead,
  PERMISSIONS.inventoryRead,
  PERMISSIONS.stockReceive,
  PERMISSIONS.stockAdjust,
  PERMISSIONS.stockMovementRead,
  PERMISSIONS.prescriptionRead,
  PERMISSIONS.prescriptionDispense,
  PERMISSIONS.prescriptionReverse,
] as const

const roleMatrix = {
  administrator: [
    ...pharmacyAdmin,
    PERMISSIONS.patientRead,
    PERMISSIONS.patientCreate,
    PERMISSIONS.departmentCreate,
    PERMISSIONS.employeeCreate,
    PERMISSIONS.employeeUpdate,
    PERMISSIONS.doctorCreate,
    PERMISSIONS.medicalRecordCreate,
    PERMISSIONS.medicalRecordFinalize,
    PERMISSIONS.prescriptionCreate,
  ],
  receptionist: [PERMISSIONS.patientRead],
  doctor: [
    PERMISSIONS.patientRead,
    PERMISSIONS.medicineRead,
    PERMISSIONS.prescriptionRead,
    PERMISSIONS.prescriptionCreate,
    PERMISSIONS.prescriptionCancel,
    PERMISSIONS.medicalRecordRead,
    PERMISSIONS.medicalRecordCreate,
    PERMISSIONS.medicalRecordFinalize,
  ],
  nurse: [PERMISSIONS.prescriptionRead],
  laboratory_staff: [],
  pharmacist: [...pharmacyPharmacist],
  unlinked_pharmacist: [...pharmacyPharmacist],
  accountant: [],
} as const

function assertSafeTestTarget(): void {
  if (process.env.HMS_DATABASE_TESTS !== 'true' || !process.env.DATABASE_URL) {
    throw new Error('Pharmacy database tests require the guarded database runner.')
  }
  const url = new URL(process.env.DATABASE_URL)
  if (
    !['localhost', '127.0.0.1', '::1'].includes(url.hostname) ||
    url.pathname.replace(/^\//, '') !== 'hms_test'
  ) {
    throw new Error('Refusing to run pharmacy tests outside local hms_test.')
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
  const codes = Object.values(PERMISSIONS).filter(
    (value) =>
      value.startsWith('inventory.') ||
      value.startsWith('stock.') ||
      value.startsWith('prescription.') ||
      value.startsWith('medicine.') ||
      value.startsWith('patient.') ||
      value.startsWith('department.') ||
      value.startsWith('employee.') ||
      value.startsWith('doctor.') ||
      value.startsWith('medical_record.'),
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
        name: `Pharmacy API ${prefix} ${roleName}`,
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
        { resourceId: { in: [...prescriptionIds, ...batchIds, ...medicineIds, ...patientIds] } },
      ],
    },
  })
  await prisma.refreshSession.deleteMany({ where: { userId: { in: userIds } } })
  await prisma.stockMovement.deleteMany({
    where: { medicineBatchId: { in: batchIds } },
  })
  await prisma.dispenseReversal.deleteMany({
    where: { reversedByUserId: { in: userIds } },
  })
  await prisma.dispenseRecord.deleteMany({
    where: { dispensedByEmployeeId: { in: employeeIds } },
  })
  await prisma.medicineBatch.deleteMany({ where: { id: { in: batchIds } } })
  const items = await prisma.prescriptionItem.findMany({
    where: { prescriptionId: { in: prescriptionIds } },
    select: { id: true },
  })
  await prisma.dispenseRecord.deleteMany({
    where: { prescriptionItemId: { in: items.map((item) => item.id) } },
  })
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
  await prisma.medicalRecord.deleteMany({ where: { id: { in: medicalRecordIds } } })
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

describe('pharmacy authorization', () => {
  it.each([
    ['administrator', 200],
    ['pharmacist', 200],
    ['doctor', 403],
    ['nurse', 403],
    ['receptionist', 403],
    ['laboratory_staff', 403],
    ['accountant', 403],
  ])('enforces inventory.read for %s', async (role, expected) => {
    expect((await authorized('get', '/api/v1/pharmacy/inventory', role)).status).toBe(expected)
  })

  it('requires authentication', async () => {
    expect((await request(app).get('/api/v1/pharmacy/inventory')).status).toBe(401)
    expect((await request(app).get('/api/v1/pharmacy/movements')).status).toBe(401)
  })

  it('denies receiving and dispensing to administrator', async () => {
    expect((await authorized('post', '/api/v1/pharmacy/receipts', 'administrator').send({})).status).toBe(403)
    const forbiddenReceive = await authorized('post', '/api/v1/pharmacy/receipts', 'administrator').send({
      medicineId: randomUUID(),
      batchNumber: 'X',
      expiryDate: '2031-01-01',
      quantity: '1',
      unitCost: '1',
      salePriceSnapshot: '1',
      currency: 'LKR',
    })
    expect(forbiddenReceive.status).toBe(403)
  })
})

describe('pharmacy inventory and dispensing', () => {
  let departmentId = ''
  let doctorEmployeeId = ''
  let pharmacistEmployeeId = ''
  let doctorId = ''
  let patientId = ''
  let medicalRecordId = ''
  let activeMedicineId = ''
  let secondMedicineId = ''
  let inactiveMedicineId = ''

  beforeAll(async () => {
    const patient = await authorized('post', '/api/v1/patients', 'administrator').send({
      firstName: 'Fictional',
      lastName: `Pharmacy${prefix.slice(-4)}`,
      dateOfBirth: '1990-05-01',
      dateOfBirthPrecision: 'month',
      sexAtRegistration: 'unknown',
    })
    expect(patient.status).toBe(201)
    patientId = patient.body.data.id
    patientIds.push(patientId)

    const department = await authorized('post', '/api/v1/departments', 'administrator').send({
      code: `${prefix}-dep`.slice(0, 30),
      name: `${prefix} pharmacy`,
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
    doctorEmployeeId = doctorEmployee.body.data.id
    employeeIds.push(doctorEmployeeId)

    const pharmacistEmployee = await authorized('post', '/api/v1/employees', 'administrator').send({
      firstName: 'Fictional',
      lastName: 'Pharmacist',
      jobTitle: 'Pharmacist',
      departmentId,
      hireDate: '2021-02-01',
      userId: userIdByRole.get('pharmacist'),
    })
    expect(pharmacistEmployee.status, JSON.stringify(pharmacistEmployee.body)).toBe(201)
    pharmacistEmployeeId = pharmacistEmployee.body.data.id
    employeeIds.push(pharmacistEmployeeId)

    const doctor = await authorized('post', '/api/v1/doctors', 'administrator').send({
      employeeId: doctorEmployeeId,
      licenseNumber: `LIC-${prefix}`,
      specialization: 'General',
    })
    expect(doctor.status).toBe(201)
    doctorId = doctor.body.data.id
    doctorIds.push(doctorId)

    const record = await authorized('post', '/api/v1/medical-records', 'doctor').send({
      patientId,
      occurredAt: '2030-03-01T12:00:00.000Z',
      diagnoses: [{ diagnosisText: 'Fictional indication' }],
    })
    expect(record.status, JSON.stringify(record.body)).toBe(201)
    medicalRecordId = record.body.data.id
    medicalRecordIds.push(medicalRecordId)
    const finalized = await authorized(
      'post',
      `/api/v1/medical-records/${medicalRecordId}/finalize`,
      'doctor',
    ).send({})
    expect(finalized.status, JSON.stringify(finalized.body)).toBe(200)

    const active = await prisma.medicine.create({
      data: {
        code: `MED-${prefix}-A`,
        genericName: 'Fictionalcillin',
        dosageForm: 'tablet',
        inventoryUnit: 'tablet',
        currency: 'LKR',
        status: 'active',
      },
    })
    activeMedicineId = active.id
    medicineIds.push(active.id)

    const second = await prisma.medicine.create({
      data: {
        code: `MED-${prefix}-B`,
        genericName: 'Placebocillin',
        dosageForm: 'tablet',
        inventoryUnit: 'tablet',
        currency: 'LKR',
        status: 'active',
      },
    })
    secondMedicineId = second.id
    medicineIds.push(second.id)

    const inactive = await prisma.medicine.create({
      data: {
        code: `MED-${prefix}-I`,
        genericName: 'Inactivecillin',
        dosageForm: 'tablet',
        inventoryUnit: 'tablet',
        currency: 'LKR',
        status: 'inactive',
      },
    })
    inactiveMedicineId = inactive.id
    medicineIds.push(inactive.id)
  })

  async function createPrescription(quantity = '10', medicineId = activeMedicineId) {
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
    return created.body.data as {
      id: string
      items: Array<{ id: string }>
      status: string
    }
  }

  function trackBatch(response: { status: number; body: { data?: { batch?: { id?: string } } } }) {
    const id = response.body.data?.batch?.id
    if ((response.status === 201 || response.status === 200) && id && !batchIds.includes(id)) {
      batchIds.push(id)
    }
  }

  it('lets the pharmacist read the active medicine catalog', async () => {
    const response = await authorized('get', '/api/v1/medicines', 'pharmacist')
    expect(response.status).toBe(200)
    const codes = response.body.data.map((row: { code: string }) => row.code)
    expect(codes).toContain(`MED-${prefix}-A`)
    expect(codes).not.toContain(`MED-${prefix}-I`)
  })

  it('rejects inactive medicine receiving and duplicate batches', async () => {
    const inactive = await authorized('post', '/api/v1/pharmacy/receipts', 'pharmacist').send({
      medicineId: inactiveMedicineId,
      batchNumber: `${prefix}-INA`,
      expiryDate: '2031-12-01',
      quantity: '10',
      unitCost: '1',
      salePriceSnapshot: '2',
      currency: 'LKR',
    })
    expect(inactive.status).toBe(409)

    const first = await authorized('post', '/api/v1/pharmacy/receipts', 'pharmacist').send({
      medicineId: activeMedicineId,
      batchNumber: `${prefix}-B1`,
      expiryDate: '2031-12-01',
      quantity: '20',
      unitCost: '5',
      salePriceSnapshot: '12',
      currency: 'LKR',
    })
    expect(first.status, JSON.stringify(first.body)).toBe(201)
    trackBatch(first)
    expect(first.body.data.batch.availableQuantity).toBe('20')

    const duplicate = await authorized('post', '/api/v1/pharmacy/receipts', 'pharmacist').send({
      medicineId: activeMedicineId,
      batchNumber: `${prefix}-B1`,
      expiryDate: '2032-01-01',
      quantity: '5',
      unitCost: '5',
      salePriceSnapshot: '12',
      currency: 'LKR',
    })
    expect(duplicate.status).toBe(409)
  })

  it('rejects client actor IDs on receiving', async () => {
    const response = await authorized('post', '/api/v1/pharmacy/receipts', 'pharmacist').send({
      medicineId: activeMedicineId,
      batchNumber: `${prefix}-ACT`,
      expiryDate: '2031-12-01',
      quantity: '1',
      unitCost: '1',
      salePriceSnapshot: '1',
      currency: 'LKR',
      employeeId: pharmacistEmployeeId,
      pharmacistId: pharmacistEmployeeId,
    })
    expect(response.status).toBe(400)
  })

  it('adjusts stock, prevents negative stock, and keeps movements append-only', async () => {
    const received = await authorized('post', '/api/v1/pharmacy/receipts', 'pharmacist').send({
      medicineId: activeMedicineId,
      batchNumber: `${prefix}-ADJ`,
      expiryDate: '2031-06-01',
      quantity: '8',
      unitCost: '3',
      salePriceSnapshot: '9',
      currency: 'LKR',
    })
    expect(received.status).toBe(201)
    trackBatch(received)
    const batchId = received.body.data.batch.id as string

    const negative = await authorized('post', '/api/v1/pharmacy/adjustments', 'pharmacist').send({
      medicineBatchId: batchId,
      quantity: '-20',
      reason: 'Would go negative',
    })
    expect(negative.status).toBe(409)

    const ok = await authorized('post', '/api/v1/pharmacy/adjustments', 'administrator').send({
      medicineBatchId: batchId,
      quantity: '-2',
      reason: 'Count correction',
    })
    expect(ok.status, JSON.stringify(ok.body)).toBe(201)
    expect(ok.body.data.movementType).toBe('adjustment')

    const inventory = await authorized('get', `/api/v1/pharmacy/inventory?search=${prefix}-ADJ`, 'administrator')
    expect(inventory.status).toBe(200)
    const row = inventory.body.data.find((batch: { id: string }) => batch.id === batchId)
    expect(row.availableQuantity).toBe('6')

    expect(
      (await authorized('patch', `/api/v1/pharmacy/movements/${ok.body.data.id}`, 'pharmacist').send({
        quantity: '1',
      })).status,
    ).toBe(404)
  })

  it('rejects unlinked pharmacist dispensing', async () => {
    const prescription = await createPrescription('4')
    const response = await authorized(
      'post',
      `/api/v1/prescriptions/${prescription.id}/items/${prescription.items[0]!.id}/dispense`,
      'unlinked_pharmacist',
    ).send({ quantity: '1' })
    expect(response.status).toBe(409)
  })

  it('rejects dispensing when pharmacist employment is inactive', async () => {
    await prisma.employee.update({
      where: { id: pharmacistEmployeeId },
      data: { employmentStatus: 'inactive' },
    })
    try {
      const prescription = await createPrescription('1')
      const response = await authorized(
        'post',
        `/api/v1/prescriptions/${prescription.id}/items/${prescription.items[0]!.id}/dispense`,
        'pharmacist',
      ).send({ quantity: '1' })
      expect(response.status).toBe(409)
    } finally {
      await prisma.employee.update({
        where: { id: pharmacistEmployeeId },
        data: { employmentStatus: 'active' },
      })
    }
  })

  it('rejects cancelled prescriptions and inactive medicines from dispensing', async () => {
    const cancelled = await createPrescription('2')
    const cancel = await authorized(
      'post',
      `/api/v1/prescriptions/${cancelled.id}/cancel`,
      'doctor',
    ).send({ cancellationReason: 'Entered in error' })
    expect(cancel.status).toBe(200)
    const dispenseCancelled = await authorized(
      'post',
      `/api/v1/prescriptions/${cancelled.id}/items/${cancelled.items[0]!.id}/dispense`,
      'pharmacist',
    ).send({ quantity: '1' })
    expect(dispenseCancelled.status).toBe(409)

    const inactiveRx = await prisma.prescription.create({
      data: {
        medicalRecordId,
        patientId,
        prescribedByDoctorId: doctorId,
        status: 'active',
        items: {
          create: {
            medicineId: inactiveMedicineId,
            dosage: '1',
            frequency: 'daily',
            duration: '1 day',
            quantityPrescribed: '1',
            unit: 'tablet',
          },
        },
      },
      include: { items: true },
    })
    prescriptionIds.push(inactiveRx.id)
    const dispenseInactive = await authorized(
      'post',
      `/api/v1/prescriptions/${inactiveRx.id}/items/${inactiveRx.items[0]!.id}/dispense`,
      'pharmacist',
    ).send({ quantity: '1' })
    expect(dispenseInactive.status).toBe(409)
  })

  it('partially and fully dispenses, then recalculates status after reversal', async () => {
    const received = await authorized('post', '/api/v1/pharmacy/receipts', 'pharmacist').send({
      medicineId: activeMedicineId,
      batchNumber: `${prefix}-DSP`,
      expiryDate: '2031-09-01',
      quantity: '15',
      unitCost: '4',
      salePriceSnapshot: '10',
      currency: 'LKR',
    })
    expect(received.status).toBe(201)
    trackBatch(received)

    const prescription = await createPrescription('10')
    const itemId = prescription.items[0]!.id
    const partial = await authorized(
      'post',
      `/api/v1/prescriptions/${prescription.id}/items/${itemId}/dispense`,
      'pharmacist',
    ).send({ quantity: '4', note: 'First fill' })
    expect(partial.status, JSON.stringify(partial.body)).toBe(200)
    expect(partial.body.data.status).toBe('partially_dispensed')
    expect(partial.body.data.items[0].quantityRemaining).toBe('6')

    const tooMuch = await authorized(
      'post',
      `/api/v1/prescriptions/${prescription.id}/items/${itemId}/dispense`,
      'pharmacist',
    ).send({ quantity: '20' })
    expect(tooMuch.status).toBe(409)

    const rest = await authorized(
      'post',
      `/api/v1/prescriptions/${prescription.id}/items/${itemId}/dispense`,
      'pharmacist',
    ).send({ quantity: '6' })
    expect(rest.status, JSON.stringify(rest.body)).toBe(200)
    expect(rest.body.data.status).toBe('dispensed')

    const already = await authorized(
      'post',
      `/api/v1/prescriptions/${prescription.id}/items/${itemId}/dispense`,
      'pharmacist',
    ).send({ quantity: '1' })
    expect(already.status).toBe(409)

    const cancelDispensed = await authorized(
      'post',
      `/api/v1/prescriptions/${prescription.id}/cancel`,
      'doctor',
    ).send({ cancellationReason: 'Too late' })
    expect(cancelDispensed.status).toBe(409)

    const firstDispenseId = partial.body.data.items[0].dispenseRecords[0].id as string
    const reverse = await authorized(
      'post',
      `/api/v1/prescriptions/${prescription.id}/dispenses/${firstDispenseId}/reverse`,
      'pharmacist',
    ).send({ reason: 'Incorrect quantity' })
    expect(reverse.status, JSON.stringify(reverse.body)).toBe(200)
    expect(reverse.body.data.status).toBe('partially_dispensed')
    expect(reverse.body.data.items[0].quantityRemaining).toBe('4')

    const duplicateReverse = await authorized(
      'post',
      `/api/v1/prescriptions/${prescription.id}/dispenses/${firstDispenseId}/reverse`,
      'administrator',
    ).send({ reason: 'Again' })
    expect(duplicateReverse.status).toBe(409)

    const secondDispenseId = rest.body.data.items[0].dispenseRecords[1].id as string
    const reverseRest = await authorized(
      'post',
      `/api/v1/prescriptions/${prescription.id}/dispenses/${secondDispenseId}/reverse`,
      'administrator',
    ).send({ reason: 'Full correction' })
    expect(reverseRest.status).toBe(200)
    expect(reverseRest.body.data.status).toBe('active')
  })

  it('rejects expired-batch dispensing and zero-availability dispenses', async () => {
    const expired = await authorized('post', '/api/v1/pharmacy/receipts', 'pharmacist').send({
      medicineId: secondMedicineId,
      batchNumber: `${prefix}-EXP`,
      expiryDate: '2020-01-01',
      quantity: '10',
      unitCost: '1',
      salePriceSnapshot: '2',
      currency: 'LKR',
    })
    expect(expired.status).toBe(201)
    trackBatch(expired)

    const prescription = await createPrescription('2', secondMedicineId)
    const response = await authorized(
      'post',
      `/api/v1/prescriptions/${prescription.id}/items/${prescription.items[0]!.id}/dispense`,
      'pharmacist',
    ).send({ quantity: '1' })
    expect(response.status).toBe(409)
    expect(String(response.body.error.message)).toMatch(/stock/i)
  })

  it('splits a dispense across multiple eligible batches', async () => {
    const first = await authorized('post', '/api/v1/pharmacy/receipts', 'pharmacist').send({
      medicineId: secondMedicineId,
      batchNumber: `${prefix}-M1`,
      expiryDate: '2031-04-01',
      quantity: '3',
      unitCost: '1',
      salePriceSnapshot: '2',
      currency: 'LKR',
    })
    const second = await authorized('post', '/api/v1/pharmacy/receipts', 'pharmacist').send({
      medicineId: secondMedicineId,
      batchNumber: `${prefix}-M2`,
      expiryDate: '2031-05-01',
      quantity: '5',
      unitCost: '1',
      salePriceSnapshot: '2',
      currency: 'LKR',
    })
    expect(first.status).toBe(201)
    expect(second.status).toBe(201)
    trackBatch(first)
    trackBatch(second)

    const prescription = await createPrescription('6', secondMedicineId)
    const response = await authorized(
      'post',
      `/api/v1/prescriptions/${prescription.id}/items/${prescription.items[0]!.id}/dispense`,
      'pharmacist',
    ).send({ quantity: '6' })
    expect(response.status, JSON.stringify(response.body)).toBe(200)
    expect(response.body.data.status).toBe('dispensed')
    const movements = await prisma.stockMovement.findMany({
      where: {
        dispenseRecordId: response.body.data.items[0].dispenseRecords[0].id,
        movementType: 'dispense',
      },
    })
    expect(movements).toHaveLength(2)
  })

  it('serializes concurrent dispenses so stock cannot go negative', async () => {
    const received = await authorized('post', '/api/v1/pharmacy/receipts', 'pharmacist').send({
      medicineId: activeMedicineId,
      batchNumber: `${prefix}-CON`,
      expiryDate: '2031-08-01',
      quantity: '5',
      unitCost: '1',
      salePriceSnapshot: '2',
      currency: 'LKR',
    })
    expect(received.status).toBe(201)
    trackBatch(received)
    const prescription = await createPrescription('5')
    const itemId = prescription.items[0]!.id
    const path = `/api/v1/prescriptions/${prescription.id}/items/${itemId}/dispense`
    const [first, second] = await Promise.all([
      authorized('post', path, 'pharmacist').send({ quantity: '5' }),
      authorized('post', path, 'pharmacist').send({ quantity: '5' }),
    ])
    const statuses = [first.status, second.status].sort()
    expect(statuses).toEqual([200, 409])
  })

  it('writes audit events for receipt, adjustment, dispense, and reversal', async () => {
    const actions = await prisma.auditLog.findMany({
      where: {
        actorUserId: { in: userIds },
        action: {
          in: [
            'stock.receive',
            'stock.adjust',
            'prescription.dispense',
            'prescription.reverse',
          ],
        },
      },
      select: { action: true, metadata: true },
    })
    const names = new Set(actions.map((row) => row.action))
    expect(names.has('stock.receive')).toBe(true)
    expect(names.has('stock.adjust')).toBe(true)
    expect(names.has('prescription.dispense')).toBe(true)
    expect(names.has('prescription.reverse')).toBe(true)
    for (const row of actions) {
      const metadata = row.metadata as Record<string, unknown>
      expect(metadata).not.toHaveProperty('note')
      expect(metadata).not.toHaveProperty('instructions')
    }
  })

  it('does not expose catalog write, billing, or movement mutation endpoints', async () => {
    expect((await authorized('post', '/api/v1/medicines', 'pharmacist').send({})).status).toBe(404)
    expect((await authorized('patch', `/api/v1/medicines/${activeMedicineId}`, 'pharmacist').send({
      status: 'inactive',
    })).status).toBe(404)
    expect((await authorized('post', '/api/v1/invoices', 'pharmacist').send({})).status).toBe(403)
    expect((await authorized('get', '/api/v1/pharmacy/reports', 'administrator')).status).toBe(404)
  })
})

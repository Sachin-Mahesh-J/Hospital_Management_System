import { randomUUID } from 'node:crypto'
import { Prisma, PrismaClient } from '@prisma/client'
import { afterAll, describe, expect, it } from 'vitest'

const ROLLBACK = Symbol('rollback')
const prisma = new PrismaClient()

function assertSafeTestTarget(): void {
  if (process.env.HMS_DATABASE_TESTS !== 'true' || !process.env.DATABASE_URL) {
    throw new Error('Database tests must be started through npm run test:database.')
  }

  const url = new URL(process.env.DATABASE_URL)
  const database = url.pathname.replace(/^\//, '')
  const port = url.port || '5432'
  const localHosts = new Set(['localhost', '127.0.0.1', '::1'])

  if (!localHosts.has(url.hostname) || port !== '5432' || database !== 'hms_test') {
    throw new Error('Refusing to run database tests outside localhost:5432/hms_test.')
  }
}

assertSafeTestTarget()

async function withRollback(
  operation: (transaction: Prisma.TransactionClient) => Promise<void>,
): Promise<void> {
  try {
    await prisma.$transaction(
      async (transaction) => {
        await operation(transaction)
        throw ROLLBACK
      },
      { maxWait: 10_000, timeout: 20_000 },
    )
  } catch (error: unknown) {
    if (error !== ROLLBACK) {
      throw error
    }
  }
}

async function captureViolation(operation: Promise<unknown>): Promise<unknown> {
  try {
    await operation
  } catch (error: unknown) {
    return error
  }

  throw new Error('Expected PostgreSQL to reject the statement.')
}

function expectPostgresViolation(
  error: unknown,
  postgresCode: string,
  messageFragment: string,
): void {
  expect(error).toBeInstanceOf(Prisma.PrismaClientKnownRequestError)
  const knownError = error as Prisma.PrismaClientKnownRequestError
  expect(knownError.code).toBe('P2010')
  expect(knownError.meta?.code).toBe(postgresCode)
  expect(String(knownError.meta?.message)).toContain(messageFragment)
}

async function createUser(transaction: Prisma.TransactionClient): Promise<string> {
  const username = `schema-${randomUUID()}`
  const rows = await transaction.$queryRaw<Array<{ id: string }>>`
    INSERT INTO "users" ("username", "password_hash")
    VALUES (${username}, 'not-a-real-password-hash')
    RETURNING "id"
  `
  return rows[0]!.id
}

async function createDepartment(
  transaction: Prisma.TransactionClient,
): Promise<string> {
  const suffix = randomUUID().slice(0, 20)
  const rows = await transaction.$queryRaw<Array<{ id: string }>>`
    INSERT INTO "departments" ("code", "name")
    VALUES (${`D-${suffix}`}, ${`Department ${suffix}`})
    RETURNING "id"
  `
  return rows[0]!.id
}

async function createDoctor(
  transaction: Prisma.TransactionClient,
): Promise<{ doctorId: string; employeeId: string }> {
  const departmentId = await createDepartment(transaction)
  const suffix = randomUUID()
  const employees = await transaction.$queryRaw<Array<{ id: string }>>`
    INSERT INTO "employees" (
      "employee_number", "department_id", "first_name", "last_name",
      "job_title", "hire_date"
    )
    VALUES (
      ${`E-${suffix}`}, ${departmentId}::uuid, 'Schema', 'Doctor',
      'Doctor', DATE '2020-01-01'
    )
    RETURNING "id"
  `
  const employeeId = employees[0]!.id
  const doctors = await transaction.$queryRaw<Array<{ id: string }>>`
    INSERT INTO "doctor_profiles" (
      "employee_id", "license_number", "specialization"
    )
    VALUES (${employeeId}::uuid, ${`L-${suffix}`}, 'Schema Testing')
    RETURNING "id"
  `

  return { doctorId: doctors[0]!.id, employeeId }
}

async function createPatient(transaction: Prisma.TransactionClient): Promise<string> {
  const suffix = randomUUID()
  const rows = await transaction.$queryRaw<Array<{ id: string }>>`
    INSERT INTO "patients" (
      "patient_number", "first_name", "last_name", "date_of_birth_precision"
    )
    VALUES (${`P-${suffix}`}, 'Schema', 'Patient', 'unknown')
    RETURNING "id"
  `
  return rows[0]!.id
}

async function createAppointment(
  transaction: Prisma.TransactionClient,
  values: {
    patientId: string
    doctorId: string
    createdByUserId: string
    startsAt: Date
    endsAt: Date
    status?: string
  },
): Promise<void> {
  await transaction.$executeRaw`
    INSERT INTO "appointments" (
      "patient_id", "doctor_id", "starts_at", "ends_at", "status",
      "created_by_user_id"
    )
    VALUES (
      ${values.patientId}::uuid, ${values.doctorId}::uuid,
      ${values.startsAt}, ${values.endsAt}, ${values.status ?? 'scheduled'},
      ${values.createdByUserId}::uuid
    )
  `
}

async function createLabRequestItem(
  transaction: Prisma.TransactionClient,
): Promise<{ employeeId: string; itemId: string }> {
  const userId = await createUser(transaction)
  const patientId = await createPatient(transaction)
  const { doctorId, employeeId } = await createDoctor(transaction)
  const suffix = randomUUID()
  const definitions = await transaction.$queryRaw<Array<{ id: string }>>`
    INSERT INTO "lab_test_definitions" ("code", "name")
    VALUES (${`LT-${suffix}`}, ${`Lab Test ${suffix}`})
    RETURNING "id"
  `
  const requests = await transaction.$queryRaw<Array<{ id: string }>>`
    INSERT INTO "lab_requests" (
      "patient_id", "requested_by_doctor_id", "clinical_note"
    )
    VALUES (${patientId}::uuid, ${doctorId}::uuid, ${`Created by ${userId}`})
    RETURNING "id"
  `
  const items = await transaction.$queryRaw<Array<{ id: string }>>`
    INSERT INTO "lab_request_items" ("lab_request_id", "test_definition_id")
    VALUES (${requests[0]!.id}::uuid, ${definitions[0]!.id}::uuid)
    RETURNING "id"
  `

  return { employeeId, itemId: items[0]!.id }
}

afterAll(async () => {
  await prisma.$disconnect()
})

describe('PostgreSQL physical schema', () => {
  it('enforces a representative foreign key', async () => {
    await withRollback(async (transaction) => {
      const error = await captureViolation(
        transaction.$executeRaw`
          INSERT INTO "user_roles" ("user_id", "role_id")
          VALUES (${randomUUID()}::uuid, ${randomUUID()}::uuid)
        `,
      )
      expectPostgresViolation(error, '23503', 'fk_user_roles_user_id')
    })
  })

  it('enforces the case-insensitive username uniqueness rule', async () => {
    await withRollback(async (transaction) => {
      const suffix = randomUUID()
      await transaction.$executeRaw`
        INSERT INTO "users" ("username", "password_hash")
        VALUES (${`Case-${suffix}`}, 'not-a-real-password-hash')
      `
      const error = await captureViolation(
        transaction.$executeRaw`
          INSERT INTO "users" ("username", "password_hash")
          VALUES (${`case-${suffix}`}, 'not-a-real-password-hash')
        `,
      )
      expectPostgresViolation(error, '23505', 'lower(username::text)')
    })
  })

  it('enforces approved status values', async () => {
    await withRollback(async (transaction) => {
      const error = await captureViolation(
        transaction.$executeRaw`
          INSERT INTO "users" ("username", "password_hash", "status")
          VALUES (
            ${`status-${randomUUID()}`}, 'not-a-real-password-hash',
            'invented_status'
          )
        `,
      )
      expectPostgresViolation(error, '23514', 'ck_users_status')
    })
  })

  it('prevents active doctor appointment overlap', async () => {
    await withRollback(async (transaction) => {
      const userId = await createUser(transaction)
      const doctor = await createDoctor(transaction)
      const firstPatientId = await createPatient(transaction)
      const secondPatientId = await createPatient(transaction)
      const startsAt = new Date('2030-01-01T10:00:00.000Z')
      const endsAt = new Date('2030-01-01T11:00:00.000Z')

      await createAppointment(transaction, {
        patientId: firstPatientId,
        doctorId: doctor.doctorId,
        createdByUserId: userId,
        startsAt,
        endsAt,
      })
      const error = await captureViolation(
        createAppointment(transaction, {
          patientId: secondPatientId,
          doctorId: doctor.doctorId,
          createdByUserId: userId,
          startsAt: new Date('2030-01-01T10:30:00.000Z'),
          endsAt: new Date('2030-01-01T11:30:00.000Z'),
        }),
      )
      expectPostgresViolation(
        error,
        '23P01',
        'ex_appointments_doctor_active_overlap',
      )
    })
  })

  it('prevents active patient appointment overlap', async () => {
    await withRollback(async (transaction) => {
      const userId = await createUser(transaction)
      const firstDoctor = await createDoctor(transaction)
      const secondDoctor = await createDoctor(transaction)
      const patientId = await createPatient(transaction)

      await createAppointment(transaction, {
        patientId,
        doctorId: firstDoctor.doctorId,
        createdByUserId: userId,
        startsAt: new Date('2030-01-01T10:00:00.000Z'),
        endsAt: new Date('2030-01-01T11:00:00.000Z'),
      })
      const error = await captureViolation(
        createAppointment(transaction, {
          patientId,
          doctorId: secondDoctor.doctorId,
          createdByUserId: userId,
          startsAt: new Date('2030-01-01T10:30:00.000Z'),
          endsAt: new Date('2030-01-01T11:30:00.000Z'),
        }),
      )
      expectPostgresViolation(
        error,
        '23P01',
        'ex_appointments_patient_active_overlap',
      )
    })
  })

  it('allows adjacent appointment intervals under the half-open policy', async () => {
    await withRollback(async (transaction) => {
      const userId = await createUser(transaction)
      const doctor = await createDoctor(transaction)
      const firstPatientId = await createPatient(transaction)
      const secondPatientId = await createPatient(transaction)

      await createAppointment(transaction, {
        patientId: firstPatientId,
        doctorId: doctor.doctorId,
        createdByUserId: userId,
        startsAt: new Date('2030-01-01T10:00:00.000Z'),
        endsAt: new Date('2030-01-01T11:00:00.000Z'),
      })
      await createAppointment(transaction, {
        patientId: secondPatientId,
        doctorId: doctor.doctorId,
        createdByUserId: userId,
        startsAt: new Date('2030-01-01T11:00:00.000Z'),
        endsAt: new Date('2030-01-01T12:00:00.000Z'),
      })
    })
  })

  it('enforces laboratory result version uniqueness', async () => {
    await withRollback(async (transaction) => {
      const { employeeId, itemId } = await createLabRequestItem(transaction)
      await transaction.$executeRaw`
        INSERT INTO "lab_results" (
          "lab_request_item_id", "version_number", "result_value",
          "entered_by_employee_id"
        )
        VALUES (${itemId}::uuid, 1, 'negative', ${employeeId}::uuid)
      `
      const error = await captureViolation(
        transaction.$executeRaw`
          INSERT INTO "lab_results" (
            "lab_request_item_id", "version_number", "result_value",
            "entered_by_employee_id"
          )
          VALUES (${itemId}::uuid, 1, 'positive', ${employeeId}::uuid)
        `,
      )
      expectPostgresViolation(
        error,
        '23505',
        'lab_request_item_id, version_number',
      )
    })
  })

  it('enforces laboratory version and finalization checks', async () => {
    await withRollback(async (transaction) => {
      const { employeeId, itemId } = await createLabRequestItem(transaction)
      const versionError = await captureViolation(
        transaction.$executeRaw`
          INSERT INTO "lab_results" (
            "lab_request_item_id", "version_number", "result_value",
            "entered_by_employee_id"
          )
          VALUES (${itemId}::uuid, 0, 'negative', ${employeeId}::uuid)
        `,
      )
      expectPostgresViolation(versionError, '23514', 'ck_lab_results_version')
    })

    await withRollback(async (transaction) => {
      const { employeeId, itemId } = await createLabRequestItem(transaction)
      const finalizationError = await captureViolation(
        transaction.$executeRaw`
          INSERT INTO "lab_results" (
            "lab_request_item_id", "version_number", "result_value",
            "entered_by_employee_id", "finalized_by_employee_id"
          )
          VALUES (
            ${itemId}::uuid, 1, 'negative', ${employeeId}::uuid,
            ${employeeId}::uuid
          )
        `,
      )
      expectPostgresViolation(
        finalizationError,
        '23514',
        'ck_lab_results_finalization',
      )
    })
  })

  it('rejects a laboratory result that supersedes itself', async () => {
    await withRollback(async (transaction) => {
      const { employeeId, itemId } = await createLabRequestItem(transaction)
      const resultId = randomUUID()
      const error = await captureViolation(
        transaction.$executeRaw`
          INSERT INTO "lab_results" (
            "id", "lab_request_item_id", "version_number", "result_value",
            "entered_by_employee_id", "supersedes_lab_result_id"
          )
          VALUES (
            ${resultId}::uuid, ${itemId}::uuid, 1, 'negative',
            ${employeeId}::uuid, ${resultId}::uuid
          )
        `,
      )
      expectPostgresViolation(error, '23514', 'ck_lab_results_not_self')
    })
  })

  it('uses approved billing precision and enforces invoice arithmetic', async () => {
    const columns = await prisma.$queryRaw<
      Array<{
        column_name: string
        numeric_precision: number
        numeric_scale: number
      }>
    >`
      SELECT "column_name", "numeric_precision", "numeric_scale"
      FROM information_schema.columns
      WHERE "table_schema" = 'public'
        AND "table_name" = 'invoices'
        AND "column_name" IN (
          'subtotal', 'discount_amount', 'tax_amount', 'total_amount',
          'amount_paid', 'balance_amount'
        )
    `
    expect(columns).toHaveLength(6)
    expect(columns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ numeric_precision: 19, numeric_scale: 4 }),
      ]),
    )
    expect(columns.every((column) => column.numeric_precision === 19)).toBe(true)
    expect(columns.every((column) => column.numeric_scale === 4)).toBe(true)

    await withRollback(async (transaction) => {
      const userId = await createUser(transaction)
      const patientId = await createPatient(transaction)
      const error = await captureViolation(
        transaction.$executeRaw`
          INSERT INTO "invoices" (
            "invoice_number", "patient_id", "currency", "subtotal",
            "discount_amount", "tax_amount", "total_amount", "amount_paid",
            "balance_amount", "created_by_user_id"
          )
          VALUES (
            ${`I-${randomUUID()}`}, ${patientId}::uuid, 'USD', 10, 0, 0,
            11, 0, 11, ${userId}::uuid
          )
        `,
      )
      expectPostgresViolation(error, '23514', 'ck_invoices_total')
    })
  })

  it('contains the approved key constraint and index structures', async () => {
    const catalogCounts = await prisma.$queryRaw<
      Array<{
        tables: number
        primary_keys: number
        foreign_keys: number
      }>
    >`
      SELECT
        (
          SELECT count(*)::int
          FROM information_schema.tables
          WHERE "table_schema" = 'public'
            AND "table_type" = 'BASE TABLE'
            AND "table_name" <> '_prisma_migrations'
        ) AS "tables",
        (
          SELECT count(*)::int
          FROM pg_constraint
          WHERE "connamespace" = 'public'::regnamespace
            AND "contype" = 'p'
            AND "conrelid" <> 'public._prisma_migrations'::regclass
        ) AS "primary_keys",
        (
          SELECT count(*)::int
          FROM pg_constraint
          WHERE "connamespace" = 'public'::regnamespace
            AND "contype" = 'f'
            AND "conrelid" <> 'public._prisma_migrations'::regclass
        ) AS "foreign_keys"
    `
    expect(catalogCounts[0]).toEqual({
      tables: 35,
      primary_keys: 35,
      foreign_keys: 68,
    })

    const extensions = await prisma.$queryRaw<Array<{ extname: string }>>`
      SELECT "extname"
      FROM pg_extension
      WHERE "extname" IN ('btree_gist', 'pgcrypto')
      ORDER BY "extname"
    `
    expect(extensions.map(({ extname }) => extname)).toEqual([
      'btree_gist',
      'pgcrypto',
    ])

    const constraints = await prisma.$queryRaw<Array<{ conname: string }>>`
      SELECT "conname"
      FROM pg_constraint
      WHERE "connamespace" = 'public'::regnamespace
        AND "conname" IN (
          'ex_appointments_doctor_active_overlap',
          'ex_appointments_patient_active_overlap',
          'uq_lab_results_lab_request_item_id_version_number',
          'ck_invoices_total',
          'ck_invoices_balance'
        )
    `
    expect(constraints.map(({ conname }) => conname).sort()).toEqual([
      'ck_invoices_balance',
      'ck_invoices_total',
      'ex_appointments_doctor_active_overlap',
      'ex_appointments_patient_active_overlap',
      'uq_lab_results_lab_request_item_id_version_number',
    ])

    const indexes = await prisma.$queryRaw<Array<{ indexname: string }>>`
      SELECT "indexname"
      FROM pg_indexes
      WHERE "schemaname" = 'public'
        AND "indexname" IN (
          'uq_users_username_ci',
          'idx_refresh_sessions_user_active',
          'idx_patients_name_ci',
          'idx_lab_results_lab_request_item_id_version_number'
        )
    `
    expect(indexes.map(({ indexname }) => indexname).sort()).toEqual([
      'idx_lab_results_lab_request_item_id_version_number',
      'idx_patients_name_ci',
      'idx_refresh_sessions_user_active',
      'uq_users_username_ci',
    ])
  })
})

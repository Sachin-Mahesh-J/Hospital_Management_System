import { createHash, randomUUID } from 'node:crypto'
import { Prisma, type PrismaClient } from '@prisma/client'
import { hashPassword } from '../../auth/password.service.js'
import { syncApprovedRolePermissions } from '../../auth/roleCatalog.js'
import {
  addCalendarDays,
  hospitalLocalMidnightUtc,
  hospitalToday,
} from '../../config/hospitalTime.js'
import { env } from '../../config/env.js'
import {
  deriveIssuedStatus,
  invoiceTotals,
  lineTotal,
  roundMoney,
  ZERO,
} from '../../modules/billing/billing.lifecycle.js'
import { writeAudit } from '../../modules/audit/audit.service.js'
import { DOCUMENT_CATEGORIES } from '../../modules/documents/document.constants.js'
import { documentStorage } from '../../storage/documentStorage.js'
import {
  DEMO_USERNAMES,
  demoAccountsForSeed,
  type DemoAccount,
} from './accounts.js'

export type { DemoAccount }

export type SeedSummary = {
  accounts: DemoAccount[]
  counts: Record<string, number>
}

type Tx = Prisma.TransactionClient

const CURRENCY = env.hospital.defaultCurrency
const DOMAIN = 'hms-demo.example.com'

function demoNumber(prefix: string, index: number): string {
  return `${prefix}-DEMO-${String(index).padStart(4, '0')}`
}

function atHospital(calendarDate: string, hour: number, minute = 0): Date {
  return new Date(
    hospitalLocalMidnightUtc(calendarDate).getTime() +
      (hour * 60 + minute) * 60_000,
  )
}

function calendarDates(from: string, to: string): string[] {
  const dates: string[] = []
  let current = from
  while (current <= to) {
    dates.push(current)
    current = addCalendarDays(current, 1)
  }
  return dates
}

function weekdayUtc(calendarDate: string): number {
  return new Date(`${calendarDate}T00:00:00.000Z`).getUTCDay()
}

function money(value: string | number): Prisma.Decimal {
  return roundMoney(value)
}

function totalsFor(lineTotals: Prisma.Decimal[]) {
  return invoiceTotals(lineTotals)
}

function demoPdf(title: string): Buffer {
  const safe = title.replace(/[()\\]/g, ' ')
  const stream = `BT /F1 12 Tf 24 720 Td (${safe}) Tj ET`
  return Buffer.from(
    `%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n4 0 obj<</Length ${stream.length}>>stream\n${stream}\nendstream\nendobj\n5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n`,
  )
}

const PATIENT_FIXTURES: Array<{
  firstName: string
  lastName: string
  dob: string | null
  precision: 'exact' | 'month' | 'year' | 'unknown'
  sex: 'female' | 'male' | 'intersex' | 'unknown' | 'not_disclosed' | null
  phone: string
  city: string
  status: 'active' | 'inactive' | 'deceased'
  emergency: string
}> = [
  { firstName: 'Nimal', lastName: 'Perera', dob: '1978-03-12', precision: 'exact', sex: 'male', phone: '0770001001', city: 'Colombo 05', status: 'active', emergency: 'Samanthi Perera' },
  { firstName: 'Chamari', lastName: 'Fernando', dob: '1985-07-21', precision: 'exact', sex: 'female', phone: '0770001002', city: 'Nugegoda', status: 'active', emergency: 'Ruwan Fernando' },
  { firstName: 'Kavindu', lastName: 'Jayawardena', dob: '2016-11-04', precision: 'exact', sex: 'male', phone: '0770001003', city: 'Kandy', status: 'active', emergency: 'Malsha Jayawardena' },
  { firstName: 'Ishara', lastName: 'Gunasekara', dob: '1992-01-30', precision: 'exact', sex: 'female', phone: '0770001004', city: 'Galle', status: 'active', emergency: 'Tharindu Gunasekara' },
  { firstName: 'Roshan', lastName: 'Dissanayake', dob: '1968-09-09', precision: 'exact', sex: 'male', phone: '0770001005', city: 'Kurunegala', status: 'active', emergency: 'Nadeesha Dissanayake' },
  { firstName: 'Sanduni', lastName: 'Wickramasinghe', dob: '2001-05-18', precision: 'exact', sex: 'female', phone: '0770001006', city: 'Matara', status: 'active', emergency: 'Chathura Wickramasinghe' },
  { firstName: 'Thilina', lastName: 'Bandara', dob: '1988-12-02', precision: 'exact', sex: 'male', phone: '0770001007', city: 'Negombo', status: 'active', emergency: 'Hiruni Bandara' },
  { firstName: 'Menaka', lastName: 'Silva', dob: '1974-04-25', precision: 'exact', sex: 'female', phone: '0770001008', city: 'Colombo 07', status: 'active', emergency: 'Prasanna Silva' },
  { firstName: 'Amal', lastName: 'Rathnayake', dob: '1959-08-14', precision: 'exact', sex: 'male', phone: '0770001009', city: 'Anuradhapura', status: 'active', emergency: 'Kusum Rathnayake' },
  { firstName: 'Dilani', lastName: 'Abeysekara', dob: '1996-02-11', precision: 'exact', sex: 'female', phone: '0770001010', city: 'Kalutara', status: 'active', emergency: 'Nishan Abeysekara' },
  { firstName: 'Hasitha', lastName: 'Kodithuwakku', dob: '1983-06-07', precision: 'exact', sex: 'male', phone: '0770001011', city: 'Ratnapura', status: 'active', emergency: 'Sewwandi Kodithuwakku' },
  { firstName: 'Nadeeka', lastName: 'Amarasinghe', dob: '1971-10-19', precision: 'exact', sex: 'female', phone: '0770001012', city: 'Badulla', status: 'active', emergency: 'Lalith Amarasinghe' },
  { firstName: 'Pradeep', lastName: 'Senanayake', dob: '1965-01-03', precision: 'exact', sex: 'male', phone: '0770001013', city: 'Gampaha', status: 'active', emergency: 'Chandani Senanayake' },
  { firstName: 'Yashodha', lastName: 'Pathirana', dob: '2019-03-28', precision: 'exact', sex: 'female', phone: '0770001014', city: 'Colombo 06', status: 'active', emergency: 'Kasun Pathirana' },
  { firstName: 'Janaka', lastName: 'Weerasinghe', dob: '1990-09-16', precision: 'exact', sex: 'male', phone: '0770001015', city: 'Panadura', status: 'active', emergency: 'Nirosha Weerasinghe' },
  { firstName: 'Shalika', lastName: 'Herath', dob: '1986-11-22', precision: 'exact', sex: 'female', phone: '0770001016', city: 'Kegalle', status: 'active', emergency: 'Asela Herath' },
  { firstName: 'Lakshan', lastName: 'Mendis', dob: '2004-07-08', precision: 'exact', sex: 'male', phone: '0770001017', city: 'Moratuwa', status: 'active', emergency: 'Deepika Mendis' },
  { firstName: 'Oshadi', lastName: 'Jayasuriya', dob: '1979-05-05', precision: 'exact', sex: 'female', phone: '0770001018', city: 'Matale', status: 'active', emergency: 'Harsha Jayasuriya' },
  { firstName: 'Chathura', lastName: 'Ranasinghe', dob: '1994-08-27', precision: 'exact', sex: 'male', phone: '0770001019', city: 'Hambantota', status: 'active', emergency: 'Pavithra Ranasinghe' },
  { firstName: 'Nimasha', lastName: 'Karunaratne', dob: '1981-12-15', precision: 'exact', sex: 'female', phone: '0770001020', city: 'Batticaloa', status: 'active', emergency: 'Suresh Karunaratne' },
  { firstName: 'Gayan', lastName: 'Liyanage', dob: '1972-02-02', precision: 'month', sex: 'male', phone: '0770001021', city: 'Puttalam', status: 'active', emergency: 'Iresha Liyanage' },
  { firstName: 'Tharushi', lastName: 'Samarakoon', dob: '1998-06-01', precision: 'month', sex: 'female', phone: '0770001022', city: 'Chilaw', status: 'active', emergency: 'Dinesh Samarakoon' },
  { firstName: 'Buddika', lastName: 'Ekanayake', dob: '1960-01-01', precision: 'year', sex: 'male', phone: '0770001023', city: 'Polonnaruwa', status: 'active', emergency: 'Renuka Ekanayake' },
  { firstName: 'Sajini', lastName: 'De Silva', dob: '2008-01-01', precision: 'year', sex: 'female', phone: '0770001024', city: 'Wattala', status: 'active', emergency: 'Mahesh De Silva' },
  { firstName: 'Unknown', lastName: 'WalkIn', dob: null, precision: 'unknown', sex: 'unknown', phone: '0770001025', city: 'Colombo 01', status: 'active', emergency: 'Duty Nurse' },
  { firstName: 'Rizwan', lastName: 'Mohamed', dob: '1987-04-13', precision: 'exact', sex: 'male', phone: '0770001026', city: 'Eravur', status: 'active', emergency: 'Fathima Mohamed' },
  { firstName: 'Amaya', lastName: 'Cooray', dob: '1993-10-29', precision: 'exact', sex: 'not_disclosed', phone: '0770001027', city: 'Dehiwala', status: 'active', emergency: 'Niluka Cooray' },
  { firstName: 'Keshara', lastName: 'Vithanage', dob: '2012-09-01', precision: 'exact', sex: 'intersex', phone: '0770001028', city: 'Maharagama', status: 'active', emergency: 'Parent Vithanage' },
  { firstName: 'Upul', lastName: 'Jayakody', dob: '1952-03-17', precision: 'exact', sex: 'male', phone: '0770001029', city: 'Horana', status: 'inactive', emergency: 'Mallika Jayakody' },
  { firstName: 'Kumari', lastName: 'Seneviratne', dob: '1948-11-11', precision: 'exact', sex: 'female', phone: '0770001030', city: 'Nuwara Eliya', status: 'inactive', emergency: 'Sunil Seneviratne' },
  { firstName: 'Wasantha', lastName: 'Rajapaksha', dob: '1940-06-20', precision: 'exact', sex: 'male', phone: '0770001031', city: 'Kurunegala', status: 'deceased', emergency: 'Family Contact' },
  { firstName: 'Leela', lastName: 'Nanayakkara', dob: '1938-01-09', precision: 'exact', sex: 'female', phone: '0770001032', city: 'Galle', status: 'deceased', emergency: 'Family Contact' },
]

export async function populateDemoDataset(
  client: PrismaClient,
): Promise<SeedSummary> {
  const today = hospitalToday()
  const accounts = demoAccountsForSeed()

  const passwordHashes = new Map<string, string>()
  for (const account of accounts) {
    passwordHashes.set(account.username, await hashPassword(account.password))
  }

  const counts: Record<string, number> = {}
  const bump = (key: string, amount = 1) => {
    counts[key] = (counts[key] ?? 0) + amount
  }

  let documentPatients: Array<{
    id: string
    status: string
    firstName: string
    lastName: string
  }> = []
  let documentUsers: Record<string, { id: string }> = {}

  await client.$transaction(
    async (tx) => {
      const roleIds = await syncApprovedRolePermissions(tx)
      const users = await createUsers(tx, accounts, passwordHashes, roleIds, bump)
      const { departments, employees, doctors } = await createOrganization(
        tx,
        users,
        today,
        bump,
      )
      const patients = await createPatients(tx, bump)
      documentPatients = patients
      documentUsers = users
      await createSchedules(tx, doctors, today, bump)
      const appointments = await createAppointments(
        tx,
        patients,
        doctors,
        users,
        today,
        bump,
      )
      const admissions = await createAdmissions(
        tx,
        patients,
        doctors,
        users,
        today,
        bump,
      )
      const records = await createMedicalRecords(
        tx,
        patients,
        employees,
        appointments,
        admissions,
        today,
        bump,
      )
      const tests = await createLabCatalog(tx, bump)
      const labRequests = await createLabRequests(
        tx,
        patients,
        doctors,
        employees,
        records,
        tests,
        today,
        bump,
      )
      const medicines = await createMedicines(tx, bump)
      const pharmacy = await createPharmacyAndPrescriptions(
        tx,
        doctors,
        employees,
        users,
        records,
        medicines,
        today,
        bump,
      )
      await createBilling(
        tx,
        appointments,
        labRequests,
        pharmacy,
        users,
        today,
        bump,
      )
      await createAttendanceAndLeave(tx, employees, users, today, bump)
      await createAuditHistory(
        tx,
        users,
        patients,
        appointments,
        departments,
        bump,
      )
    },
    { timeout: 180_000, maxWait: 20_000 },
  )

  await createDocuments(client, documentPatients, documentUsers, bump)

  return { accounts, counts }
}

async function createUsers(
  tx: Tx,
  accounts: DemoAccount[],
  passwordHashes: Map<string, string>,
  roleIds: Map<string, string>,
  bump: (key: string, amount?: number) => void,
) {
  const users: Record<string, { id: string; username: string; role: string }> = {}
  let assignedBy: string | null = null
  for (const account of accounts) {
    const status = account.status
    const user = await tx.user.create({
      data: {
        username: account.username,
        passwordHash: passwordHashes.get(account.username)!,
        status,
      },
    })
    if (!assignedBy && account.role === 'administrator' && status === 'active') {
      assignedBy = user.id
    }
    await tx.userRole.create({
      data: {
        userId: user.id,
        roleId: roleIds.get(account.role)!,
        assignedByUserId: assignedBy,
      },
    })
    users[account.username] = {
      id: user.id,
      username: user.username,
      role: account.role,
    }
    bump('users')
    bump('userRoles')
  }
  return users
}

async function createOrganization(
  tx: Tx,
  users: Record<string, { id: string; username: string; role: string }>,
  today: string,
  bump: (key: string, amount?: number) => void,
) {
  const departmentRows = [
    ['GEN', 'General Medicine', 'General outpatient and inpatient medicine.', 'active'],
    ['CARD', 'Cardiology', 'Cardiac clinics and ward care.', 'active'],
    ['PAED', 'Pediatrics', 'Child health clinics.', 'active'],
    ['ORTH', 'Orthopedics', 'Musculoskeletal clinics.', 'active'],
    ['DERM', 'Dermatology', 'Skin clinics.', 'active'],
    ['NURS', 'Nursing', 'Ward and clinic nursing.', 'active'],
    ['LAB', 'Laboratory', 'Clinical laboratory.', 'active'],
    ['PHARM', 'Pharmacy', 'In-hospital pharmacy.', 'active'],
    ['RECEP', 'Reception', 'Front office and appointments.', 'active'],
    ['ADMIN', 'Administration', 'Hospital administration.', 'active'],
    ['ARCH', 'Archive Services', 'Closed records department.', 'inactive'],
  ] as const

  const departments: Record<string, string> = {}
  for (const [code, name, description, status] of departmentRows) {
    const row = await tx.department.create({
      data: { code, name, description, status },
    })
    departments[code] = row.id
    bump('departments')
  }

  const employeeSpecs: Array<{
    key: string
    username?: string
    department: string
    firstName: string
    lastName: string
    jobTitle: string
    status: 'active' | 'inactive' | 'terminated'
    hireOffset: number
    endOffset?: number
    doctor?: { license: string; specialization: string; status: 'active' | 'inactive' }
  }> = [
    { key: 'admin', username: DEMO_USERNAMES.admin, department: 'ADMIN', firstName: 'Anjali', lastName: 'Perera', jobTitle: 'Hospital Administrator', status: 'active', hireOffset: -1200 },
    { key: 'adminOps', username: DEMO_USERNAMES.adminOps, department: 'ADMIN', firstName: 'Mahesh', lastName: 'Jayawardena', jobTitle: 'Operations Administrator', status: 'active', hireOffset: -800 },
    { key: 'docGen', username: DEMO_USERNAMES.doctor, department: 'GEN', firstName: 'Anusha', lastName: 'Wijesinghe', jobTitle: 'Consultant Physician', status: 'active', hireOffset: -2000, doctor: { license: 'SLMC-DEMO-1001', specialization: 'General Medicine', status: 'active' } },
    { key: 'docCard', username: DEMO_USERNAMES.doctorCardio, department: 'CARD', firstName: 'Ruwan', lastName: 'Dissanayake', jobTitle: 'Consultant Cardiologist', status: 'active', hireOffset: -1800, doctor: { license: 'SLMC-DEMO-1002', specialization: 'Cardiology', status: 'active' } },
    { key: 'docPaed', username: DEMO_USERNAMES.doctorPediatrics, department: 'PAED', firstName: 'Nilmini', lastName: 'Fernando', jobTitle: 'Consultant Paediatrician', status: 'active', hireOffset: -1600, doctor: { license: 'SLMC-DEMO-1003', specialization: 'Pediatrics', status: 'active' } },
    { key: 'docOrth', username: DEMO_USERNAMES.doctorOrtho, department: 'ORTH', firstName: 'Kasun', lastName: 'Bandara', jobTitle: 'Consultant Orthopaedic Surgeon', status: 'active', hireOffset: -1500, doctor: { license: 'SLMC-DEMO-1004', specialization: 'Orthopedics', status: 'active' } },
    { key: 'docDerm', username: DEMO_USERNAMES.doctorDerma, department: 'DERM', firstName: 'Harshani', lastName: 'Silva', jobTitle: 'Consultant Dermatologist', status: 'active', hireOffset: -1400, doctor: { license: 'SLMC-DEMO-1005', specialization: 'Dermatology', status: 'active' } },
    { key: 'docGen2', department: 'GEN', firstName: 'Prasad', lastName: 'Gunawardena', jobTitle: 'Senior Medical Officer', status: 'active', hireOffset: -900, doctor: { license: 'SLMC-DEMO-1006', specialization: 'General Medicine', status: 'active' } },
    { key: 'docCard2', department: 'CARD', firstName: 'Ishani', lastName: 'Rathnayake', jobTitle: 'Cardiology Medical Officer', status: 'active', hireOffset: -700, doctor: { license: 'SLMC-DEMO-1007', specialization: 'Cardiology', status: 'active' } },
    { key: 'docInactive', department: 'PAED', firstName: 'Lalith', lastName: 'Abeywickrama', jobTitle: 'Paediatrician', status: 'inactive', hireOffset: -2500, endOffset: -40, doctor: { license: 'SLMC-DEMO-1099', specialization: 'Pediatrics', status: 'inactive' } },
    { key: 'nurse', username: DEMO_USERNAMES.nurse, department: 'NURS', firstName: 'Sewwandi', lastName: 'Herath', jobTitle: 'Senior Nurse', status: 'active', hireOffset: -1100 },
    { key: 'nurse2', department: 'NURS', firstName: 'Chamika', lastName: 'Dias', jobTitle: 'Staff Nurse', status: 'active', hireOffset: -600 },
    { key: 'nurseInactive', username: DEMO_USERNAMES.nurseInactive, department: 'NURS', firstName: 'Roshini', lastName: 'Peiris', jobTitle: 'Staff Nurse', status: 'inactive', hireOffset: -900, endOffset: -20 },
    { key: 'recep', username: DEMO_USERNAMES.reception, department: 'RECEP', firstName: 'Dilshan', lastName: 'Jayasena', jobTitle: 'Receptionist', status: 'active', hireOffset: -500 },
    { key: 'recepInactive', username: DEMO_USERNAMES.receptionInactive, department: 'RECEP', firstName: 'Pavithra', lastName: 'Peris', jobTitle: 'Receptionist', status: 'inactive', hireOffset: -400, endOffset: -10 },
    { key: 'lab', username: DEMO_USERNAMES.lab, department: 'LAB', firstName: 'Harendra', lastName: 'Silva', jobTitle: 'Medical Laboratory Technologist', status: 'active', hireOffset: -1000 },
    { key: 'lab2', department: 'LAB', firstName: 'Nimasha', lastName: 'Perera', jobTitle: 'Laboratory Assistant', status: 'active', hireOffset: -300 },
    { key: 'pharm', username: DEMO_USERNAMES.pharmacist, department: 'PHARM', firstName: 'Sajith', lastName: 'Fernando', jobTitle: 'Pharmacist', status: 'active', hireOffset: -950 },
    { key: 'acct', username: DEMO_USERNAMES.accountant, department: 'ADMIN', firstName: 'Nadeesha', lastName: 'Karunaratne', jobTitle: 'Accountant', status: 'active', hireOffset: -850 },
    { key: 'terminated', department: 'NURS', firstName: 'Sunil', lastName: 'Wickrema', jobTitle: 'Attendant', status: 'terminated', hireOffset: -2000, endOffset: -90 },
  ]

  const employees: Record<string, { id: string; userId: string | null; firstName: string; lastName: string }> = {}
  const doctors: Record<string, { id: string; employeeId: string; employeeKey: string }> = {}
  let employeeIndex = 1
  for (const spec of employeeSpecs) {
    const hireDate = addCalendarDays(today, spec.hireOffset)
    const endDate =
      spec.endOffset === undefined ? null : addCalendarDays(today, spec.endOffset)
    const row = await tx.employee.create({
      data: {
        employeeNumber: demoNumber('E', employeeIndex),
        userId: spec.username ? users[spec.username]!.id : null,
        departmentId: departments[spec.department]!,
        firstName: spec.firstName,
        lastName: spec.lastName,
        phone: `077010${String(employeeIndex).padStart(4, '0')}`,
        email: `${spec.key.replace(/[A-Z]/g, (c) => `.${c.toLowerCase()}`)}@${DOMAIN}`,
        jobTitle: spec.jobTitle,
        employmentStatus: spec.status,
        hireDate: new Date(`${hireDate}T00:00:00.000Z`),
        endDate: endDate ? new Date(`${endDate}T00:00:00.000Z`) : null,
      },
    })
    employeeIndex += 1
    employees[spec.key] = {
      id: row.id,
      userId: row.userId,
      firstName: spec.firstName,
      lastName: spec.lastName,
    }
    bump('employees')
    if (spec.doctor) {
      const doctor = await tx.doctorProfile.create({
        data: {
          employeeId: row.id,
          licenseNumber: spec.doctor.license,
          specialization: spec.doctor.specialization,
          professionalSummary: `Demo ${spec.doctor.specialization} clinician for interview walkthroughs.`,
          contactExtension: `10${employeeIndex}`,
          status: spec.doctor.status,
        },
      })
      doctors[spec.key] = {
        id: doctor.id,
        employeeId: row.id,
        employeeKey: spec.key,
      }
      bump('doctors')
    }
  }
  return { departments, employees, doctors }
}

async function createPatients(
  tx: Tx,
  bump: (key: string, amount?: number) => void,
) {
  const patients: Array<{ id: string; status: string; firstName: string; lastName: string }> = []
  let index = 1
  for (const fixture of PATIENT_FIXTURES) {
    const row = await tx.patient.create({
      data: {
        patientNumber: demoNumber('P', index),
        firstName: fixture.firstName,
        lastName: fixture.lastName,
        dateOfBirth: fixture.dob ? new Date(`${fixture.dob}T00:00:00.000Z`) : null,
        dateOfBirthPrecision: fixture.precision,
        sexAtRegistration: fixture.sex,
        phone: fixture.phone,
        email: `${fixture.firstName.toLowerCase()}.${fixture.lastName.toLowerCase().replace(/\s+/g, '')}@${DOMAIN}`,
        addressText: `${12 + index} Demo Lane, ${fixture.city}, Sri Lanka`,
        emergencyContactName: fixture.emergency,
        emergencyContactPhone: `077020${String(index).padStart(4, '0')}`,
        status: fixture.status,
      },
    })
    patients.push({
      id: row.id,
      status: row.status,
      firstName: fixture.firstName,
      lastName: fixture.lastName,
    })
    index += 1
    bump('patients')
  }
  return patients
}

async function createSchedules(
  tx: Tx,
  doctors: Record<string, { id: string; employeeId: string; employeeKey: string }>,
  today: string,
  bump: (key: string, amount?: number) => void,
) {
  const activeDoctorKeys = Object.entries(doctors)
    .filter(([key]) => key !== 'docInactive')
    .map(([, value]) => value)
  const from = addCalendarDays(today, -21)
  const to = addCalendarDays(today, 21)
  for (const doctor of activeDoctorKeys) {
    for (const date of calendarDates(from, to)) {
      const day = weekdayUtc(date)
      if (day === 0) continue
      if (day === 6 && doctor.employeeKey !== 'docGen') continue
      await tx.doctorSchedule.create({
        data: {
          doctorId: doctor.id,
          startsAt: atHospital(date, 9, 0),
          endsAt: atHospital(date, 12, 0),
          status: 'available',
          note: 'Morning clinic',
        },
      })
      bump('schedules')
      if (['docGen', 'docCard', 'docPaed'].includes(doctor.employeeKey) && day !== 6) {
        await tx.doctorSchedule.create({
          data: {
            doctorId: doctor.id,
            startsAt: atHospital(date, 14, 0),
            endsAt: atHospital(date, 17, 0),
            status: 'available',
            note: 'Afternoon clinic',
          },
        })
        bump('schedules')
      }
    }
  }
  const extraDate = addCalendarDays(today, 5)
  await tx.doctorSchedule.create({
    data: {
      doctorId: doctors.docDerm!.id,
      startsAt: atHospital(extraDate, 12, 0),
      endsAt: atHospital(extraDate, 13, 0),
      status: 'unavailable',
      note: 'Department meeting',
    },
  })
  bump('schedules')
  await tx.doctorSchedule.create({
    data: {
      doctorId: doctors.docOrth!.id,
      startsAt: atHospital(addCalendarDays(today, 6), 12, 0),
      endsAt: atHospital(addCalendarDays(today, 6), 13, 0),
      status: 'cancelled',
      note: 'Cancelled extra slot',
    },
  })
  bump('schedules')
}

async function createAppointments(
  tx: Tx,
  patients: Array<{ id: string; status: string }>,
  doctors: Record<string, { id: string; employeeId: string; employeeKey: string }>,
  users: Record<string, { id: string }>,
  today: string,
  bump: (key: string, amount?: number) => void,
) {
  const creatorId = users[DEMO_USERNAMES.reception]!.id
  const doctorList = ['docGen', 'docCard', 'docPaed', 'docOrth', 'docDerm', 'docGen2', 'docCard2']
    .map((key) => doctors[key]!)
  const activePatients = patients.filter((patient) => patient.status === 'active')
  const appointments: Array<{
    id: string
    patientId: string
    doctorId: string
    status: string
    startsAt: Date
  }> = []

  const addAppointment = async (input: {
    patient: { id: string }
    doctor: { id: string }
    date: string
    hour: number
    minute: number
    durationMin: number
    status: 'scheduled' | 'checked_in' | 'completed' | 'cancelled' | 'no_show'
    reason: string
    rescheduledFromId?: string
  }) => {
    const startsAt = atHospital(input.date, input.hour, input.minute)
    const endsAt = new Date(startsAt.getTime() + input.durationMin * 60_000)
    const cancelled = input.status === 'cancelled'
    const row = await tx.appointment.create({
      data: {
        patientId: input.patient.id,
        doctorId: input.doctor.id,
        startsAt,
        endsAt,
        status: input.status,
        reason: input.reason,
        cancellationReason: cancelled ? 'Patient requested a later slot.' : null,
        cancelledAt: cancelled ? new Date(startsAt.getTime() - 86_400_000) : null,
        cancelledByUserId: cancelled ? creatorId : null,
        rescheduledFromAppointmentId: input.rescheduledFromId ?? null,
        createdByUserId: creatorId,
      },
    })
    appointments.push({
      id: row.id,
      patientId: row.patientId,
      doctorId: row.doctorId,
      status: row.status,
      startsAt: row.startsAt,
    })
    bump('appointments')
    return row
  }

  const reasons = [
    'Follow-up for hypertension',
    'Chest discomfort review',
    'Paediatric fever review',
    'Knee pain assessment',
    'Skin rash review',
    'Diabetes review',
    'Pre-operative assessment',
    'Medication review',
  ]

  let patientCursor = 0
  const nextPatient = () => {
    const patient = activePatients[patientCursor % activePatients.length]!
    patientCursor += 1
    return patient
  }

  await addAppointment({
    patient: nextPatient(),
    doctor: doctors.docGen!,
    date: today,
    hour: 9,
    minute: 0,
    durationMin: 30,
    status: 'scheduled',
    reason: 'Today morning review',
  })
  await addAppointment({
    patient: nextPatient(),
    doctor: doctors.docCard!,
    date: today,
    hour: 9,
    minute: 30,
    durationMin: 30,
    status: 'checked_in',
    reason: 'Today cardiology review',
  })
  await addAppointment({
    patient: nextPatient(),
    doctor: doctors.docPaed!,
    date: today,
    hour: 10,
    minute: 0,
    durationMin: 30,
    status: 'completed',
    reason: 'Today paediatric review',
  })
  await addAppointment({
    patient: nextPatient(),
    doctor: doctors.docOrth!,
    date: today,
    hour: 10,
    minute: 30,
    durationMin: 30,
    status: 'no_show',
    reason: 'Today orthopaedic review',
  })
  await addAppointment({
    patient: nextPatient(),
    doctor: doctors.docDerm!,
    date: today,
    hour: 11,
    minute: 0,
    durationMin: 30,
    status: 'cancelled',
    reason: 'Today dermatology review',
  })

  const pastDates = [-14, -10, -7, -5, -3, -2, -1]
  for (const offset of pastDates) {
    const date = addCalendarDays(today, offset)
    if (weekdayUtc(date) === 0) continue
    for (const [index, doctor] of doctorList.entries()) {
      const status =
        index % 5 === 0
          ? 'completed'
          : index % 5 === 1
            ? 'cancelled'
            : index % 5 === 2
              ? 'no_show'
              : 'completed'
      await addAppointment({
        patient: nextPatient(),
        doctor,
        date,
        hour: 9,
        minute: (index % 4) * 30,
        durationMin: 30,
        status,
        reason: reasons[index % reasons.length]!,
      })
    }
  }

  const futureDates = [1, 2, 3, 6, 7, 8]
  for (const offset of futureDates) {
    const date = addCalendarDays(today, offset)
    if (weekdayUtc(date) === 0) continue
    await addAppointment({
      patient: nextPatient(),
      doctor: doctors.docGen!,
      date,
      hour: 9,
      minute: 0,
      durationMin: 30,
      status: 'scheduled',
      reason: 'Scheduled general medicine visit',
    })
    await addAppointment({
      patient: nextPatient(),
      doctor: doctors.docCard!,
      date,
      hour: 9,
      minute: 30,
      durationMin: 30,
      status: offset === 8 ? 'scheduled' : 'scheduled',
      reason: 'Scheduled cardiology visit',
    })
  }

  const overlapDate = addCalendarDays(today, 8)
  await addAppointment({
    patient: nextPatient(),
    doctor: doctors.docCard!,
    date: overlapDate,
    hour: 10,
    minute: 0,
    durationMin: 30,
    status: 'scheduled',
    reason: 'Existing booking that will overlap approved leave',
  })
  await addAppointment({
    patient: nextPatient(),
    doctor: doctors.docCard!,
    date: overlapDate,
    hour: 11,
    minute: 0,
    durationMin: 30,
    status: 'checked_in',
    reason: 'Second existing booking overlapping approved leave',
  })

  const original = await addAppointment({
    patient: activePatients[3]!,
    doctor: doctors.docGen!,
    date: addCalendarDays(today, -6),
    hour: 11,
    minute: 0,
    durationMin: 30,
    status: 'cancelled',
    reason: 'Original slot before reschedule',
  })
  await addAppointment({
    patient: activePatients[3]!,
    doctor: doctors.docGen!,
    date: addCalendarDays(today, 4),
    hour: 11,
    minute: 0,
    durationMin: 30,
    status: 'scheduled',
    reason: 'Rescheduled general medicine visit',
    rescheduledFromId: original.id,
  })

  return appointments
}

async function createAdmissions(
  tx: Tx,
  patients: Array<{ id: string; status: string }>,
  doctors: Record<string, { id: string }>,
  users: Record<string, { id: string }>,
  today: string,
  bump: (key: string, amount?: number) => void,
) {
  const creatorId = users[DEMO_USERNAMES.reception]!.id
  const active = patients.filter((patient) => patient.status === 'active')
  const admissions: Array<{ id: string; patientId: string; status: string }> = []
  const specs: Array<{
    patient: { id: string }
    doctorId: string
    admittedOffset: number
    status: 'admitted' | 'discharged' | 'cancelled'
    reason: string
    summary?: string
    dischargedOffset?: number
  }> = [
    { patient: active[0]!, doctorId: doctors.docGen!.id, admittedOffset: -2, status: 'admitted', reason: 'Uncontrolled hypertension requiring observation.' },
    { patient: active[4]!, doctorId: doctors.docCard!.id, admittedOffset: -1, status: 'admitted', reason: 'Chest pain rule-out and cardiac monitoring.' },
    { patient: active[8]!, doctorId: doctors.docOrth!.id, admittedOffset: -3, status: 'admitted', reason: 'Post-fall pain and mobility assessment.' },
    { patient: active[1]!, doctorId: doctors.docGen!.id, admittedOffset: -20, status: 'discharged', dischargedOffset: -16, reason: 'Community-acquired infection.', summary: 'Improved on oral antibiotics. Discharged with clinic follow-up.' },
    { patient: active[2]!, doctorId: doctors.docPaed!.id, admittedOffset: -12, status: 'discharged', dischargedOffset: -10, reason: 'Paediatric dehydration.', summary: 'Rehydrated and feeding well. Discharged home.' },
    { patient: active[5]!, doctorId: doctors.docDerm!.id, admittedOffset: -18, status: 'discharged', dischargedOffset: -15, reason: 'Severe dermatitis flare.', summary: 'Symptoms improved. Outpatient dermatology review arranged.' },
    { patient: active[6]!, doctorId: doctors.docCard!.id, admittedOffset: -30, status: 'discharged', dischargedOffset: -24, reason: 'Heart failure optimisation.', summary: 'Diuretic plan adjusted. Cardiology clinic in two weeks.' },
    { patient: active[7]!, doctorId: doctors.docGen!.id, admittedOffset: -9, status: 'cancelled', reason: 'Planned admission for elective review.' },
    { patient: active[9]!, doctorId: doctors.docOrth!.id, admittedOffset: -11, status: 'cancelled', reason: 'Admission created in error for an outpatient.' },
    { patient: active[10]!, doctorId: doctors.docGen2!.id, admittedOffset: -40, status: 'discharged', dischargedOffset: -35, reason: 'Glycaemic control and education.', summary: 'Stable for home monitoring. Diet counselling completed.' },
    { patient: active[11]!, doctorId: doctors.docPaed!.id, admittedOffset: -25, status: 'discharged', dischargedOffset: -23, reason: 'Asthma exacerbation.', summary: 'Inhaler technique reviewed. Discharged with action plan.' },
    { patient: active[12]!, doctorId: doctors.docCard2!.id, admittedOffset: -15, status: 'discharged', dischargedOffset: -12, reason: 'Palpitations for evaluation.', summary: 'ECG monitoring unremarkable. Outpatient follow-up.' },
  ]

  let index = 1
  for (const spec of specs) {
    const admittedAt = atHospital(addCalendarDays(today, spec.admittedOffset), 10, 15)
    const row = await tx.admission.create({
      data: {
        admissionNumber: demoNumber('ADM', index),
        patientId: spec.patient.id,
        attendingDoctorId: spec.doctorId,
        admittedAt,
        dischargedAt:
          spec.status === 'discharged'
            ? atHospital(addCalendarDays(today, spec.dischargedOffset ?? spec.admittedOffset + 3), 11, 0)
            : null,
        status: spec.status,
        reason: spec.reason,
        dischargeSummary: spec.summary ?? null,
        createdByUserId: creatorId,
      },
    })
    admissions.push({ id: row.id, patientId: row.patientId, status: row.status })
    index += 1
    bump('admissions')
  }
  return admissions
}

async function createMedicalRecords(
  tx: Tx,
  patients: Array<{ id: string; status: string }>,
  employees: Record<string, { id: string }>,
  appointments: Array<{ id: string; patientId: string; status: string }>,
  admissions: Array<{ id: string; patientId: string; status: string }>,
  today: string,
  bump: (key: string, amount?: number) => void,
) {
  const authors = [
    employees.docGen!.id,
    employees.docCard!.id,
    employees.docPaed!.id,
    employees.docOrth!.id,
    employees.docDerm!.id,
  ]
  const records: Array<{ id: string; patientId: string; status: string; authorEmployeeId: string }> = []

  const completed = appointments.filter((row) => row.status === 'completed')
  let index = 0
  for (const appointment of completed.slice(0, 10)) {
    const occurredAt = atHospital(addCalendarDays(today, -7 + (index % 6)), 10, 30)
    const status = index === 0 ? 'draft' : 'final'
    const row = await tx.medicalRecord.create({
      data: {
        patientId: appointment.patientId,
        authorEmployeeId: authors[index % authors.length]!,
        appointmentId: appointment.id,
        occurredAt,
        status,
        finalizedAt: status === 'final' ? occurredAt : null,
      },
    })
    await tx.diagnosis.create({
      data: {
        medicalRecordId: row.id,
        diagnosisText: 'Demo clinical impression: stable chronic condition for outpatient follow-up.',
      },
    })
    await tx.treatment.create({
      data: {
        medicalRecordId: row.id,
        treatmentText: 'Lifestyle advice, medication review, and scheduled clinic follow-up.',
      },
    })
    if (index % 2 === 0) {
      await tx.medicalReport.create({
        data: {
          medicalRecordId: row.id,
          title: 'Clinic note',
          reportText: 'Fictional interview demo note. No real patient data.',
        },
      })
      bump('medicalReports')
    }
    records.push({
      id: row.id,
      patientId: row.patientId,
      status: row.status,
      authorEmployeeId: row.authorEmployeeId,
    })
    bump('medicalRecords')
    bump('diagnoses')
    bump('treatments')
    index += 1
  }

  const discharged = admissions.filter((row) => row.status === 'discharged')
  for (const [admissionIndex, admission] of discharged.slice(0, 6).entries()) {
    const occurredAt = atHospital(addCalendarDays(today, -18 + admissionIndex), 15, 0)
    const row = await tx.medicalRecord.create({
      data: {
        patientId: admission.patientId,
        authorEmployeeId: authors[admissionIndex % authors.length]!,
        admissionId: admission.id,
        occurredAt,
        status: 'final',
        finalizedAt: occurredAt,
      },
    })
    await tx.diagnosis.create({
      data: {
        medicalRecordId: row.id,
        diagnosisText: 'Inpatient demo diagnosis for interview walkthrough.',
      },
    })
    await tx.treatment.create({
      data: {
        medicalRecordId: row.id,
        treatmentText: 'Supportive inpatient care and discharge planning.',
      },
    })
    records.push({
      id: row.id,
      patientId: row.patientId,
      status: row.status,
      authorEmployeeId: row.authorEmployeeId,
    })
    bump('medicalRecords')
    bump('diagnoses')
    bump('treatments')
  }

  const predecessor = await tx.medicalRecord.create({
    data: {
      patientId: patients[0]!.id,
      authorEmployeeId: employees.docGen!.id,
      occurredAt: atHospital(addCalendarDays(today, -9), 9, 45),
      status: 'amended',
      finalizedAt: atHospital(addCalendarDays(today, -9), 10, 0),
    },
  })
  await tx.diagnosis.create({
    data: {
      medicalRecordId: predecessor.id,
      diagnosisText: 'Original demo diagnosis later amended.',
    },
  })
  const successor = await tx.medicalRecord.create({
    data: {
      patientId: patients[0]!.id,
      authorEmployeeId: employees.docGen!.id,
      occurredAt: atHospital(addCalendarDays(today, -8), 9, 45),
      status: 'final',
      finalizedAt: atHospital(addCalendarDays(today, -8), 11, 0),
      amendsMedicalRecordId: predecessor.id,
    },
  })
  await tx.diagnosis.create({
    data: {
      medicalRecordId: successor.id,
      diagnosisText: 'Amended demo diagnosis after clinical review.',
    },
  })
  await tx.treatment.create({
    data: {
      medicalRecordId: successor.id,
      treatmentText: 'Updated treatment plan after amendment.',
    },
  })
  records.push(
    {
      id: predecessor.id,
      patientId: predecessor.patientId,
      status: predecessor.status,
      authorEmployeeId: predecessor.authorEmployeeId,
    },
    {
      id: successor.id,
      patientId: successor.patientId,
      status: successor.status,
      authorEmployeeId: successor.authorEmployeeId,
    },
  )
  bump('medicalRecords', 2)
  bump('diagnoses', 2)
  bump('treatments')

  const extraDraft = await tx.medicalRecord.create({
    data: {
      patientId: patients[3]!.id,
      authorEmployeeId: employees.docDerm!.id,
      occurredAt: atHospital(today, 8, 30),
      status: 'draft',
    },
  })
  await tx.diagnosis.create({
    data: {
      medicalRecordId: extraDraft.id,
      diagnosisText: 'Draft dermatology note in progress.',
    },
  })
  records.push({
    id: extraDraft.id,
    patientId: extraDraft.patientId,
    status: extraDraft.status,
    authorEmployeeId: extraDraft.authorEmployeeId,
  })
  bump('medicalRecords')
  bump('diagnoses')
  return records
}

async function createLabCatalog(
  tx: Tx,
  bump: (key: string, amount?: number) => void,
) {
  const tests = [
    ['FBC', 'Full Blood Count', 'Blood', 'x10^9/L', 'WBC 4.0-11.0', '1200.0000', 'active'],
    ['FBS', 'Fasting Blood Sugar', 'Blood', 'mg/dL', '70-100', '800.0000', 'active'],
    ['HBA1C', 'HbA1c', 'Blood', '%', '4.0-5.6', '1800.0000', 'active'],
    ['LIPID', 'Lipid Profile', 'Blood', 'mg/dL', 'LDL < 100', '2200.0000', 'active'],
    ['TSH', 'Thyroid Stimulating Hormone', 'Blood', 'mIU/L', '0.4-4.0', '1600.0000', 'active'],
    ['CRP', 'C-Reactive Protein', 'Blood', 'mg/L', '< 5', '1400.0000', 'active'],
    ['LFT', 'Liver Function Tests', 'Blood', 'U/L', 'ALT 7-56', '2100.0000', 'active'],
    ['RFT', 'Renal Function Tests', 'Blood', 'mg/dL', 'Creatinine 0.6-1.2', '1900.0000', 'active'],
    ['UFR', 'Urine Full Report', 'Urine', null, 'No active sediment', '700.0000', 'active'],
    ['ECG', 'Electrocardiogram', null, null, 'Interpretation by clinician', '2500.0000', 'active'],
    ['CXR', 'Chest X-Ray', null, null, 'Radiologist report', '3200.0000', 'active'],
    ['ARCHTEST', 'Archived Demo Panel', 'Blood', 'n/a', 'Inactive catalog row', '500.0000', 'inactive'],
  ] as const
  const created: Record<string, { id: string; code: string; price: string; unit: string | null; range: string | null }> = {}
  for (const [code, name, specimen, unit, range, price, status] of tests) {
    const row = await tx.labTestDefinition.create({
      data: {
        code,
        name,
        specimenType: specimen,
        defaultUnit: unit,
        referenceRangeDescription: range,
        price: money(price),
        currency: CURRENCY,
        status,
      },
    })
    created[code] = {
      id: row.id,
      code,
      price,
      unit,
      range,
    }
    bump('labTests')
  }
  return created
}

async function createLabRequests(
  tx: Tx,
  patients: Array<{ id: string; status: string }>,
  doctors: Record<string, { id: string }>,
  employees: Record<string, { id: string }>,
  records: Array<{ id: string; patientId: string; status: string }>,
  tests: Record<string, { id: string; code: string; price: string; unit: string | null; range: string | null }>,
  today: string,
  bump: (key: string, amount?: number) => void,
) {
  const labStaffId = employees.lab!.id
  const active = patients.filter((patient) => patient.status === 'active')
  const finals = records.filter((row) => row.status === 'final')
  const requests: Array<{
    id: string
    patientId: string
    status: string
    items: Array<{ id: string; status: string; testCode: string }>
  }> = []

  const createRequest = async (input: {
    patientId: string
    doctorId: string
    date: string
    hour: number
    codes: string[]
    itemStatuses: Array<'requested' | 'sample_collected' | 'completed' | 'cancelled'>
    parentStatus: 'requested' | 'sample_collected' | 'in_progress' | 'completed' | 'cancelled'
    note: string
    recordId?: string | undefined
    values?: Array<{ value: string; note?: string }>
  }) => {
    const requestedAt = atHospital(input.date, input.hour, 0)
    const request = await tx.labRequest.create({
      data: {
        patientId: input.patientId,
        requestedByDoctorId: input.doctorId,
        medicalRecordId: input.recordId ?? null,
        requestedAt,
        status: input.parentStatus,
        clinicalNote: input.note,
      },
    })
    const items: Array<{ id: string; status: string; testCode: string }> = []
    for (const [index, code] of input.codes.entries()) {
      const test = tests[code]!
      const itemStatus = input.itemStatuses[index]!
      const collected = itemStatus === 'sample_collected' || itemStatus === 'completed'
      const item = await tx.labRequestItem.create({
        data: {
          labRequestId: request.id,
          testDefinitionId: test.id,
          status: itemStatus,
          sampleCollectedAt: collected ? new Date(requestedAt.getTime() + 3_600_000) : null,
          sampleCollectedByEmployeeId: collected ? labStaffId : null,
          priceSnapshot: money(test.price),
          currency: CURRENCY,
        },
      })
      if (itemStatus === 'completed') {
        const result = input.values?.[index]
        await tx.labResult.create({
          data: {
            labRequestItemId: item.id,
            versionNumber: 1,
            resultValue: result?.value ?? 'Demo result within fictional range.',
            resultUnit: test.unit,
            referenceRangeSnapshot: test.range,
            resultNote: result?.note ?? 'Fictional laboratory demo value.',
            enteredByEmployeeId: labStaffId,
            enteredAt: new Date(requestedAt.getTime() + 7_200_000),
          },
        })
        bump('labResults')
      }
      items.push({ id: item.id, status: itemStatus, testCode: code })
      bump('labRequestItems')
    }
    requests.push({
      id: request.id,
      patientId: request.patientId,
      status: input.parentStatus,
      items,
    })
    bump('labRequests')
  }

  await createRequest({
    patientId: active[0]!.id,
    doctorId: doctors.docGen!.id,
    date: addCalendarDays(today, -6),
    hour: 8,
    codes: ['FBC', 'FBS'],
    itemStatuses: ['completed', 'completed'],
    parentStatus: 'completed',
    note: 'Routine metabolic screen.',
    recordId: finals.find((row) => row.patientId === active[0]!.id)?.id,
    values: [
      { value: '8.1', note: 'Within fictional reference range.' },
      { value: '126', note: 'Mildly elevated fictional fasting glucose.' },
    ],
  })
  await createRequest({
    patientId: active[1]!.id,
    doctorId: doctors.docCard!.id,
    date: addCalendarDays(today, -4),
    hour: 9,
    codes: ['LIPID', 'TSH'],
    itemStatuses: ['completed', 'completed'],
    parentStatus: 'completed',
    note: 'Cardiometabolic review.',
    values: [
      { value: 'LDL 148', note: 'Fictional elevated LDL.' },
      { value: '2.1', note: 'Within fictional TSH range.' },
    ],
  })
  await createRequest({
    patientId: active[2]!.id,
    doctorId: doctors.docPaed!.id,
    date: addCalendarDays(today, -2),
    hour: 10,
    codes: ['UFR'],
    itemStatuses: ['sample_collected'],
    parentStatus: 'sample_collected',
    note: 'Paediatric urine screen.',
  })
  await createRequest({
    patientId: active[3]!.id,
    doctorId: doctors.docDerm!.id,
    date: today,
    hour: 8,
    codes: ['CRP'],
    itemStatuses: ['requested'],
    parentStatus: 'requested',
    note: 'Inflammatory marker.',
  })
  await createRequest({
    patientId: active[4]!.id,
    doctorId: doctors.docGen!.id,
    date: addCalendarDays(today, -1),
    hour: 11,
    codes: ['LFT', 'RFT'],
    itemStatuses: ['sample_collected', 'requested'],
    parentStatus: 'in_progress',
    note: 'Mixed-progress chemistry panel.',
  })
  await createRequest({
    patientId: active[5]!.id,
    doctorId: doctors.docOrth!.id,
    date: addCalendarDays(today, -8),
    hour: 9,
    codes: ['FBC'],
    itemStatuses: ['cancelled'],
    parentStatus: 'cancelled',
    note: 'Cancelled after duplicate order.',
  })
  for (const offset of [-13, -11, -9, -7, -5, -3]) {
    const patient = active[Math.abs(offset) % active.length]!
    await createRequest({
      patientId: patient.id,
      doctorId: doctors.docGen2!.id,
      date: addCalendarDays(today, offset),
      hour: 8,
      codes: ['HBA1C', 'FBS'],
      itemStatuses: ['completed', 'completed'],
      parentStatus: 'completed',
      note: 'Diabetes monitoring panel.',
      values: [
        { value: offset === -5 ? '7.8' : '5.4', note: offset === -5 ? 'Fictional elevated HbA1c.' : 'Fictional normal HbA1c.' },
        { value: offset === -5 ? '142' : '92', note: 'Fictional glucose value.' },
      ],
    })
  }
  await createRequest({
    patientId: active[6]!.id,
    doctorId: doctors.docCard2!.id,
    date: addCalendarDays(today, -1),
    hour: 14,
    codes: ['ECG', 'CXR'],
    itemStatuses: ['completed', 'sample_collected'],
    parentStatus: 'in_progress',
    note: 'Chest pain work-up.',
    values: [{ value: 'Sinus rhythm, fictional tracing', note: 'No emergency findings in this demo.' }],
  })
  return requests
}

async function createMedicines(tx: Tx, bump: (key: string, amount?: number) => void) {
  const rows = [
    ['PARA500', 'Paracetamol', 'Panadol Demo', 'tablet', '500 mg', 'tablet', '12.0000', '50'],
    ['AMLO5', 'Amlodipine', 'Amlong Demo', 'tablet', '5 mg', 'tablet', '18.5000', '30'],
    ['MET500', 'Metformin', 'Glyciphage Demo', 'tablet', '500 mg', 'tablet', '9.2500', '40'],
    ['ATOR20', 'Atorvastatin', 'Atorva Demo', 'tablet', '20 mg', 'tablet', '32.0000', '25'],
    ['LOS50', 'Losartan', 'Losacar Demo', 'tablet', '50 mg', 'tablet', '21.0000', '20'],
    ['SALB', 'Salbutamol', 'Ventolin Demo', 'inhaler', '100 mcg', 'inhaler', '850.0000', '8'],
    ['AMOX250', 'Amoxicillin', 'Amoxil Demo', 'capsule', '250 mg', 'capsule', '15.0000', '40'],
    ['CET10', 'Cetirizine', 'Cetriz Demo', 'tablet', '10 mg', 'tablet', '8.0000', '25'],
    ['OMEP20', 'Omeprazole', 'Omez Demo', 'capsule', '20 mg', 'capsule', '14.0000', '20'],
    ['HYDROC', 'Hydrocortisone', 'Cortiderm Demo', 'cream', '1%', 'tube', '220.0000', '10'],
    ['ORS', 'Oral Rehydration Salts', 'Jeevani Demo', 'sachet', '20.5 g', 'sachet', '35.0000', '60'],
    ['IBU400', 'Ibuprofen', 'Brufen Demo', 'tablet', '400 mg', 'tablet', '11.0000', '35'],
    ['INSULN', 'Insulin Regular', 'Demo Insulin', 'injection', '100 IU/ml', 'vial', '1450.0000', '6'],
    ['ARCHMED', 'Archived Compound', 'Legacy Demo', 'tablet', 'n/a', 'tablet', '5.0000', '0'],
  ] as const
  const medicines: Record<string, { id: string; unit: string; price: string; status: string }> = {}
  for (const [code, genericName, brandName, dosageForm, strength, unit, price, threshold] of rows) {
    const row = await tx.medicine.create({
      data: {
        code,
        genericName,
        brandName,
        dosageForm,
        strength,
        inventoryUnit: unit,
        defaultSalePrice: money(price),
        currency: CURRENCY,
        lowStockThreshold: threshold,
        status: code === 'ARCHMED' ? 'inactive' : 'active',
      },
    })
    medicines[code] = {
      id: row.id,
      unit,
      price,
      status: row.status,
    }
    bump('medicines')
  }
  return medicines
}

async function createPharmacyAndPrescriptions(
  tx: Tx,
  doctors: Record<string, { id: string }>,
  employees: Record<string, { id: string; userId: string | null }>,
  users: Record<string, { id: string }>,
  records: Array<{ id: string; patientId: string; status: string; authorEmployeeId: string }>,
  medicines: Record<string, { id: string; unit: string; price: string; status: string }>,
  today: string,
  bump: (key: string, amount?: number) => void,
) {
  const pharmacistUserId = users[DEMO_USERNAMES.pharmacist]!.id
  const pharmacistEmployeeId = employees.pharm!.id
  const batches: Record<string, string> = {}

  const receive = async (
    code: string,
    batchNumber: string,
    expiryOffset: number,
    quantity: string,
    unitCost: string,
  ) => {
    const medicine = medicines[code]!
    const batch = await tx.medicineBatch.create({
      data: {
        medicineId: medicine.id,
        batchNumber,
        expiryDate: new Date(`${addCalendarDays(today, expiryOffset)}T00:00:00.000Z`),
        receivedQuantity: quantity,
        unitCost: money(unitCost),
        salePriceSnapshot: money(medicine.price),
        currency: CURRENCY,
        receivedAt: atHospital(addCalendarDays(today, -20), 9, 0),
        status: 'active',
      },
    })
    await tx.stockMovement.create({
      data: {
        medicineBatchId: batch.id,
        movementType: 'receipt',
        quantity,
        performedByUserId: pharmacistUserId,
        reason: 'Stock receipt',
      },
    })
    batches[`${code}:${batchNumber}`] = batch.id
    bump('batches')
    bump('stockMovements')
    return batch.id
  }

  await receive('PARA500', 'PARA-A1', 240, '200', '6.0000')
  await receive('AMLO5', 'AMLO-A1', 180, '120', '9.0000')
  await receive('MET500', 'MET-A1', 200, '150', '4.5000')
  await receive('ATOR20', 'ATOR-A1', 160, '80', '15.0000')
  await receive('LOS50', 'LOS-A1', 150, '90', '10.0000')
  await receive('SALB', 'SALB-A1', 12, '10', '400.0000')
  await receive('AMOX250', 'AMOX-A1', 90, '100', '7.0000')
  await receive('CET10', 'CET-A1', 100, '60', '3.5000')
  await receive('OMEP20', 'OMEP-A1', 110, '70', '6.5000')
  await receive('HYDROC', 'HYDRO-A1', 80, '25', '90.0000')
  await receive('ORS', 'ORS-A1', 60, '80', '12.0000')
  await receive('IBU400', 'IBU-A1', 70, '40', '5.0000')
  await receive('INSULN', 'INS-A1', 20, '8', '900.0000')
  await receive('PARA500', 'PARA-EXP', -10, '30', '6.0000')
  await receive('CET10', 'CET-LOW', 40, '6', '3.5000')

  await tx.stockMovement.create({
    data: {
      medicineBatchId: batches['IBU400:IBU-A1']!,
      movementType: 'adjustment',
      quantity: '-5',
      performedByUserId: pharmacistUserId,
      reason: 'Damaged blister packs removed from shelf.',
    },
  })
  bump('stockMovements')

  const finals = records.filter((row) => row.status === 'final')
  const prescriptions: Array<{
    id: string
    patientId: string
    status: string
    items: Array<{ id: string; medicineCode: string; quantity: string; unit: string }>
    dispenses: Array<{ id: string; itemId: string }>
  }> = []

  const doctorByEmployee: Record<string, string> = {
    [employees.docGen!.id]: doctors.docGen!.id,
    [employees.docCard!.id]: doctors.docCard!.id,
    [employees.docPaed!.id]: doctors.docPaed!.id,
    [employees.docOrth!.id]: doctors.docOrth!.id,
    [employees.docDerm!.id]: doctors.docDerm!.id,
  }

  const addPrescription = async (input: {
    record: { id: string; patientId: string; authorEmployeeId: string }
    status: 'active' | 'partially_dispensed' | 'dispensed' | 'cancelled'
    items: Array<{ code: string; quantity: string; dosage: string; frequency: string; duration: string }>
    dateOffset: number
    dispense?: Array<{ itemIndex: number; quantity: string; batchKey: string; reverse?: boolean }> | undefined
  }) => {
    const prescribedBy = doctorByEmployee[input.record.authorEmployeeId] ?? doctors.docGen!.id
    const row = await tx.prescription.create({
      data: {
        medicalRecordId: input.record.id,
        patientId: input.record.patientId,
        prescribedByDoctorId: prescribedBy,
        prescribedAt: atHospital(addCalendarDays(today, input.dateOffset), 11, 15),
        status: input.status,
        notes: 'Fictional demo prescription. Not for clinical use.',
      },
    })
    const items: Array<{ id: string; medicineCode: string; quantity: string; unit: string }> = []
    for (const item of input.items) {
      const medicine = medicines[item.code]!
      const created = await tx.prescriptionItem.create({
        data: {
          prescriptionId: row.id,
          medicineId: medicine.id,
          dosage: item.dosage,
          route: 'oral',
          frequency: item.frequency,
          duration: item.duration,
          instructions: 'Take as directed. Demo data only.',
          quantityPrescribed: item.quantity,
          unit: medicine.unit,
        },
      })
      items.push({
        id: created.id,
        medicineCode: item.code,
        quantity: item.quantity,
        unit: medicine.unit,
      })
      bump('prescriptionItems')
    }
    const dispenses: Array<{ id: string; itemId: string }> = []
    for (const dispense of input.dispense ?? []) {
      const item = items[dispense.itemIndex]!
      const record = await tx.dispenseRecord.create({
        data: {
          prescriptionItemId: item.id,
          quantityDispensed: dispense.quantity,
          unit: item.unit,
          dispensedAt: atHospital(addCalendarDays(today, input.dateOffset), 12, 0),
          dispensedByEmployeeId: pharmacistEmployeeId,
          status: 'completed',
          note: 'Demo dispensary issue.',
        },
      })
      await tx.stockMovement.create({
        data: {
          medicineBatchId: batches[dispense.batchKey]!,
          movementType: 'dispense',
          quantity: `-${dispense.quantity}`,
          dispenseRecordId: record.id,
          performedByUserId: pharmacistUserId,
          reason: 'Prescription dispense',
          referenceIdentifier: row.id,
        },
      })
      bump('dispenses')
      bump('stockMovements')
      if (dispense.reverse) {
        const reversal = await tx.dispenseReversal.create({
          data: {
            dispenseRecordId: record.id,
            quantityReversed: dispense.quantity,
            reason: 'Patient returned unused demo pack.',
            reversedByUserId: pharmacistUserId,
            reversedAt: atHospital(addCalendarDays(today, input.dateOffset), 15, 0),
          },
        })
        await tx.stockMovement.create({
          data: {
            medicineBatchId: batches[dispense.batchKey]!,
            movementType: 'return',
            quantity: dispense.quantity,
            dispenseReversalId: reversal.id,
            performedByUserId: pharmacistUserId,
            reason: 'Patient returned unused demo pack.',
            referenceIdentifier: record.id,
          },
        })
        bump('dispenseReversals')
        bump('stockMovements')
      } else {
        dispenses.push({ id: record.id, itemId: item.id })
      }
    }
    prescriptions.push({
      id: row.id,
      patientId: row.patientId,
      status: input.status,
      items,
      dispenses,
    })
    bump('prescriptions')
  }

  if (finals[0]) {
    await addPrescription({
      record: finals[0],
      status: 'active',
      dateOffset: -1,
      items: [
        { code: 'AMLO5', quantity: '30', dosage: '5 mg', frequency: 'once daily', duration: '30 days' },
      ],
    })
  }
  if (finals[1]) {
    await addPrescription({
      record: finals[1],
      status: 'partially_dispensed',
      dateOffset: -4,
      items: [
        { code: 'MET500', quantity: '60', dosage: '500 mg', frequency: 'twice daily', duration: '30 days' },
      ],
      dispense: [{ itemIndex: 0, quantity: '20', batchKey: 'MET500:MET-A1' }],
    })
  }
  if (finals[2]) {
    await addPrescription({
      record: finals[2],
      status: 'dispensed',
      dateOffset: -6,
      items: [
        { code: 'PARA500', quantity: '20', dosage: '500 mg', frequency: 'three times daily', duration: '5 days' },
      ],
      dispense: [{ itemIndex: 0, quantity: '20', batchKey: 'PARA500:PARA-A1' }],
    })
  }
  if (finals[3]) {
    await addPrescription({
      record: finals[3],
      status: 'cancelled',
      dateOffset: -3,
      items: [
        { code: 'CET10', quantity: '10', dosage: '10 mg', frequency: 'once daily', duration: '10 days' },
      ],
    })
  }
  if (finals[4]) {
    await addPrescription({
      record: finals[4],
      status: 'dispensed',
      dateOffset: -8,
      items: [
        { code: 'AMOX250', quantity: '21', dosage: '250 mg', frequency: 'three times daily', duration: '7 days' },
      ],
      dispense: [{ itemIndex: 0, quantity: '21', batchKey: 'AMOX250:AMOX-A1', reverse: true }],
    })
  }
  for (const [index, record] of finals.slice(5, 12).entries()) {
    await addPrescription({
      record,
      status: index % 2 === 0 ? 'active' : 'dispensed',
      dateOffset: -10 + index,
      items: [
        { code: 'OMEP20', quantity: '14', dosage: '20 mg', frequency: 'once daily', duration: '14 days' },
        { code: 'IBU400', quantity: '10', dosage: '400 mg', frequency: 'twice daily', duration: '5 days' },
      ],
      dispense:
        index % 2 === 0
          ? undefined
          : [
              { itemIndex: 0, quantity: '14', batchKey: 'OMEP20:OMEP-A1' },
              { itemIndex: 1, quantity: '10', batchKey: 'IBU400:IBU-A1' },
            ],
    })
  }
  return { batches, prescriptions }
}

async function createBilling(
  tx: Tx,
  appointments: Array<{ id: string; patientId: string; status: string }>,
  labRequests: Array<{
    patientId: string
    items: Array<{ id: string; status: string }>
  }>,
  pharmacy: {
    prescriptions: Array<{
      patientId: string
      dispenses: Array<{ id: string }>
    }>
  },
  users: Record<string, { id: string }>,
  today: string,
  bump: (key: string, amount?: number) => void,
) {
  const accountantId = users[DEMO_USERNAMES.accountant]!.id
  const completedAppointments = appointments.filter((row) => row.status === 'completed')
  const completedLabItems = labRequests.flatMap((request) =>
    request.items
      .filter((item) => item.status === 'completed')
      .map((item) => ({ id: item.id, patientId: request.patientId })),
  )
  const dispenses = pharmacy.prescriptions.flatMap((prescription) =>
    prescription.dispenses.map((dispense) => ({
      id: dispense.id,
      patientId: prescription.patientId,
    })),
  )

  let invoiceIndex = 1
  let paymentIndex = 1

  const createInvoice = async (input: {
    patientId: string
    status: 'draft' | 'issued' | 'partially_paid' | 'paid' | 'void'
    issuedOffset: number
    items: Array<{
      category: 'consultation' | 'laboratory' | 'pharmacy'
      description: string
      unitPrice: string
      appointmentId?: string
      labRequestItemId?: string
      dispenseRecordId?: string
    }>
    payments?: Array<{
      amount: string
      method: 'cash' | 'card' | 'bank_transfer'
      reverse?: boolean
    }> | undefined
  }) => {
    const lineRows = input.items.map((item) => {
      const quantity = money('1')
      const unitPrice = money(item.unitPrice)
      return {
        ...item,
        quantity,
        unitPrice,
        lineTotal: lineTotal(quantity, unitPrice),
      }
    })
    const totals = totalsFor(lineRows.map((row) => row.lineTotal))
    const issuedAt = atHospital(addCalendarDays(today, input.issuedOffset), 16, 0)
    const recordedPayments = (input.payments ?? []).filter((row) => !row.reverse)
    const paid = recordedPayments.reduce(
      (sum, payment) => sum.plus(money(payment.amount)),
      ZERO,
    )
    const issuedStatus =
      input.status === 'draft' || input.status === 'void'
        ? input.status
        : deriveIssuedStatus(totals.totalAmount, paid)
    const invoice = await tx.invoice.create({
      data: {
        invoiceNumber: demoNumber('INV', invoiceIndex),
        patientId: input.patientId,
        issuedAt,
        dueAt: new Date(issuedAt.getTime() + 7 * 86_400_000),
        currency: CURRENCY,
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        taxAmount: totals.taxAmount,
        totalAmount: totals.totalAmount,
        amountPaid: input.status === 'void' ? ZERO : paid,
        balanceAmount:
          input.status === 'void'
            ? totals.totalAmount
            : roundMoney(totals.totalAmount.minus(paid)),
        status: issuedStatus,
        createdByUserId: accountantId,
      },
    })
    invoiceIndex += 1
    bump('invoices')
    for (const item of lineRows) {
      await tx.invoiceItem.create({
        data: {
          invoiceId: invoice.id,
          category: item.category,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
          appointmentId: item.appointmentId ?? null,
          labRequestItemId: item.labRequestItemId ?? null,
          dispenseRecordId: item.dispenseRecordId ?? null,
        },
      })
      bump('invoiceItems')
    }
    for (const payment of input.payments ?? []) {
      const original = await tx.payment.create({
        data: {
          paymentNumber: demoNumber('PAY', paymentIndex),
          invoiceId: invoice.id,
          amount: money(payment.amount),
          currency: CURRENCY,
          method: payment.method,
          status: payment.reverse ? 'reversed' : 'recorded',
          paidAt: new Date(issuedAt.getTime() + 3_600_000),
          receivedByUserId: accountantId,
          note: payment.reverse ? 'Replaced by reversal row.' : 'Demo payment',
        },
      })
      paymentIndex += 1
      bump('payments')
      if (payment.reverse) {
        await tx.payment.create({
          data: {
            paymentNumber: demoNumber('PAY', paymentIndex),
            invoiceId: invoice.id,
            amount: money(payment.amount),
            currency: CURRENCY,
            method: payment.method,
            status: 'recorded',
            paidAt: new Date(issuedAt.getTime() + 7_200_000),
            receivedByUserId: accountantId,
            reversesPaymentId: original.id,
            note: 'Received on the wrong invoice; reversed for demo.',
          },
        })
        paymentIndex += 1
        bump('payments')
      }
    }
    return invoice
  }

  const consult = completedAppointments[0]
  if (consult) {
    await createInvoice({
      patientId: consult.patientId,
      status: 'paid',
      issuedOffset: -6,
      items: [
        {
          category: 'consultation',
          description: 'General medicine consultation',
          unitPrice: '3500.0000',
          appointmentId: consult.id,
        },
      ],
      payments: [{ amount: '3500.0000', method: 'cash' }],
    })
  }
  const consult2 = completedAppointments[1]
  if (consult2) {
    await createInvoice({
      patientId: consult2.patientId,
      status: 'partially_paid',
      issuedOffset: -4,
      items: [
        {
          category: 'consultation',
          description: 'Cardiology consultation',
          unitPrice: '5500.0000',
          appointmentId: consult2.id,
        },
      ],
      payments: [{ amount: '2000.0000', method: 'card' }],
    })
  }
  const consult3 = completedAppointments[2]
  if (consult3) {
    await createInvoice({
      patientId: consult3.patientId,
      status: 'issued',
      issuedOffset: -2,
      items: [
        {
          category: 'consultation',
          description: 'Paediatric consultation',
          unitPrice: '3000.0000',
          appointmentId: consult3.id,
        },
      ],
    })
  }
  const consult4 = completedAppointments[3]
  if (consult4) {
    await createInvoice({
      patientId: consult4.patientId,
      status: 'draft',
      issuedOffset: 0,
      items: [
        {
          category: 'consultation',
          description: 'Draft orthopaedic consultation invoice',
          unitPrice: '4000.0000',
          appointmentId: consult4.id,
        },
      ],
    })
  }
  const consult5 = completedAppointments[4]
  if (consult5) {
    await createInvoice({
      patientId: consult5.patientId,
      status: 'void',
      issuedOffset: -9,
      items: [
        {
          category: 'consultation',
          description: 'Voided duplicate consultation invoice',
          unitPrice: '3500.0000',
          appointmentId: consult5.id,
        },
      ],
    })
  }
  const labItem = completedLabItems[0]
  if (labItem) {
    await createInvoice({
      patientId: labItem.patientId,
      status: 'paid',
      issuedOffset: -5,
      items: [
        {
          category: 'laboratory',
          description: 'Completed laboratory panel',
          unitPrice: '2000.0000',
          labRequestItemId: labItem.id,
        },
      ],
      payments: [{ amount: '2000.0000', method: 'bank_transfer' }],
    })
  }
  const labItem2 = completedLabItems[1]
  if (labItem2) {
    await createInvoice({
      patientId: labItem2.patientId,
      status: 'issued',
      issuedOffset: -1,
      items: [
        {
          category: 'laboratory',
          description: 'Outstanding laboratory invoice',
          unitPrice: '1600.0000',
          labRequestItemId: labItem2.id,
        },
      ],
    })
  }
  const dispense = dispenses[0]
  if (dispense) {
    await createInvoice({
      patientId: dispense.patientId,
      status: 'paid',
      issuedOffset: -6,
      items: [
        {
          category: 'pharmacy',
          description: 'Dispensed medicines',
          unitPrice: '240.0000',
          dispenseRecordId: dispense.id,
        },
      ],
      payments: [{ amount: '240.0000', method: 'cash' }],
    })
  }
  const consult6 = completedAppointments[5]
  if (consult6) {
    await createInvoice({
      patientId: consult6.patientId,
      status: 'issued',
      issuedOffset: -3,
      items: [
        {
          category: 'consultation',
          description: 'Consultation later reversed',
          unitPrice: '3500.0000',
          appointmentId: consult6.id,
        },
      ],
      payments: [{ amount: '3500.0000', method: 'card', reverse: true }],
    })
  }
  for (const [index, appointment] of completedAppointments.slice(6, 14).entries()) {
    await createInvoice({
      patientId: appointment.patientId,
      status: index % 3 === 0 ? 'paid' : index % 3 === 1 ? 'partially_paid' : 'issued',
      issuedOffset: -12 + index,
      items: [
        {
          category: 'consultation',
          description: 'Clinic consultation',
          unitPrice: '3750.0000',
          appointmentId: appointment.id,
        },
      ],
      payments:
        index % 3 === 0
          ? [{ amount: '3750.0000', method: 'cash' }]
          : index % 3 === 1
            ? [{ amount: '1500.0000', method: 'card' }]
            : undefined,
    })
  }
}

async function createAttendanceAndLeave(
  tx: Tx,
  employees: Record<string, { id: string; userId: string | null }>,
  users: Record<string, { id: string }>,
  today: string,
  bump: (key: string, amount?: number) => void,
) {
  const recorderId = users[DEMO_USERNAMES.admin]!.id
  const staffKeys = ['docGen', 'docCard', 'nurse', 'recep', 'lab', 'pharm', 'acct', 'terminated']
  const workDates = calendarDates(addCalendarDays(today, -12), addCalendarDays(today, -1)).filter(
    (date) => weekdayUtc(date) !== 0 && weekdayUtc(date) !== 6,
  )
  for (const [employeeIndex, key] of staffKeys.entries()) {
    const employee = employees[key]!
    for (const [dateIndex, date] of workDates.entries()) {
      if (key === 'terminated' && dateIndex > 2) continue
      const pattern = (employeeIndex + dateIndex) % 5
      const status = pattern === 0 ? 'absent' : pattern === 1 ? 'leave' : 'present'
      await tx.attendanceRecord.create({
        data: {
          employeeId: employee.id,
          workDate: new Date(`${date}T00:00:00.000Z`),
          status,
          checkInAt: status === 'present' ? atHospital(date, 8, 30) : null,
          checkOutAt: status === 'present' ? atHospital(date, 16, 45) : null,
          note:
            status === 'absent'
              ? 'Demo unplanned absence.'
              : status === 'leave'
                ? 'Recorded against an approved leave day.'
                : 'On duty.',
          recordedByUserId: recorderId,
        },
      })
      bump('attendance')
    }
  }

  const decide = users[DEMO_USERNAMES.admin]!.id
  const leaveRows: Array<{
    employeeId: string
    start: number
    end: number
    type: string
    status: 'pending' | 'approved' | 'rejected' | 'cancelled'
    reason: string
  }> = [
    { employeeId: employees.docCard!.id, start: 8, end: 10, type: 'annual', status: 'approved', reason: 'Approved leave overlapping existing cardiology appointments.' },
    { employeeId: employees.docGen!.id, start: 20, end: 22, type: 'annual', status: 'approved', reason: 'Approved leave that blocks new bookings.' },
    { employeeId: employees.nurse!.id, start: 4, end: 5, type: 'sick', status: 'pending', reason: 'Pending sick leave request.' },
    { employeeId: employees.lab!.id, start: -18, end: -17, type: 'casual', status: 'rejected', reason: 'Insufficient coverage.' },
    { employeeId: employees.pharm!.id, start: -14, end: -13, type: 'annual', status: 'cancelled', reason: 'Staff cancelled before decision.' },
    { employeeId: employees.recep!.id, start: -8, end: -7, type: 'casual', status: 'approved', reason: 'Approved short leave.' },
    { employeeId: employees.acct!.id, start: 12, end: 13, type: 'study', status: 'pending', reason: 'Exam leave request.' },
    { employeeId: employees.docPaed!.id, start: -21, end: -19, type: 'annual', status: 'approved', reason: 'Historical approved leave.' },
    { employeeId: employees.docOrth!.id, start: 15, end: 16, type: 'sick', status: 'pending', reason: 'Upcoming medical appointment.' },
    { employeeId: employees.docDerm!.id, start: -4, end: -4, type: 'casual', status: 'rejected', reason: 'Clinic already rostered.' },
    { employeeId: employees.nurse2!.id, start: 2, end: 3, type: 'annual', status: 'approved', reason: 'Rostered annual leave.' },
    { employeeId: employees.lab2!.id, start: -11, end: -11, type: 'casual', status: 'cancelled', reason: 'Request withdrawn.' },
    { employeeId: employees.docGen2!.id, start: 18, end: 19, type: 'annual', status: 'pending', reason: 'Family event.' },
    { employeeId: employees.admin!.id, start: -25, end: -24, type: 'annual', status: 'approved', reason: 'Historical admin leave.' },
    { employeeId: employees.terminated!.id, start: -100, end: -99, type: 'annual', status: 'approved', reason: 'Leave taken before termination.' },
  ]
  for (const row of leaveRows) {
    const decided = row.status === 'approved' || row.status === 'rejected'
    await tx.leaveRecord.create({
      data: {
        employeeId: row.employeeId,
        startsOn: new Date(`${addCalendarDays(today, row.start)}T00:00:00.000Z`),
        endsOn: new Date(`${addCalendarDays(today, row.end)}T00:00:00.000Z`),
        leaveType: row.type,
        reason: row.reason,
        status: row.status,
        decidedByUserId: decided ? decide : null,
        decidedAt: decided ? atHospital(addCalendarDays(today, row.start - 2), 9, 0) : null,
        decisionNote: decided
          ? row.status === 'approved'
            ? 'Approved for demo coverage planning.'
            : 'Rejected for demo roster conflict.'
          : null,
      },
    })
    bump('leave')
  }
}

async function createDocuments(
  tx: PrismaClient,
  patients: Array<{ id: string; status: string; firstName: string; lastName: string }>,
  users: Record<string, { id: string }>,
  bump: (key: string, amount?: number) => void,
) {
  const uploaderId = users[DEMO_USERNAMES.nurse]!.id
  const active = patients.filter((patient) => patient.status === 'active')
  for (const [index, category] of DOCUMENT_CATEGORIES.entries()) {
    const patient = active[index]!
    const title = `Demo ${category.replaceAll('_', ' ')}`
    const bytes = demoPdf(`HMS Demo ${title}`)
    const objectKey = `patient-documents/${randomUUID()}`
    await documentStorage.put(objectKey, bytes, 'application/pdf')
    await tx.patientDocument.create({
      data: {
        patientId: patient.id,
        uploadedByUserId: uploaderId,
        objectKey,
        originalName: `${category}-demo.pdf`,
        detectedMediaType: 'application/pdf',
        sizeBytes: BigInt(bytes.length),
        checksum: createHash('sha256').update(bytes).digest('hex'),
        title,
        category,
        status: 'available',
        description: 'Fictional demo document generated for the interview dataset.',
        uploadedAt: new Date(),
      },
    })
    bump('documents')
  }
  for (const extra of [5, 6, 7, 8, 9, 10]) {
    const patient = active[extra]!
    const bytes = demoPdf(`HMS Demo extra report ${extra}`)
    const objectKey = `patient-documents/${randomUUID()}`
    await documentStorage.put(objectKey, bytes, 'application/pdf')
    await tx.patientDocument.create({
      data: {
        patientId: patient.id,
        uploadedByUserId: uploaderId,
        objectKey,
        originalName: `medical-report-demo-${extra}.pdf`,
        detectedMediaType: 'application/pdf',
        sizeBytes: BigInt(bytes.length),
        checksum: createHash('sha256').update(bytes).digest('hex'),
        title: 'Demo medical report',
        category: 'medical_report',
        status: 'available',
        description: 'Additional fictional document for list and category filters.',
        uploadedAt: new Date(),
      },
    })
    bump('documents')
  }
}

async function createAuditHistory(
  tx: Tx,
  users: Record<string, { id: string }>,
  patients: Array<{ id: string }>,
  appointments: Array<{ id: string }>,
  departments: Record<string, string>,
  bump: (key: string, amount?: number) => void,
) {
  const adminId = users[DEMO_USERNAMES.admin]!.id
  const receptionistId = users[DEMO_USERNAMES.reception]!.id
  const events: Array<{
    actorUserId: string
    action: string
    resourceType: string
    resourceId: string | null
    outcome: 'success' | 'failure' | 'denied'
    metadata: Prisma.InputJsonObject
  }> = [
    { actorUserId: adminId, action: 'auth.login', resourceType: 'user', resourceId: adminId, outcome: 'success', metadata: { fields: ['username'] } },
    { actorUserId: receptionistId, action: 'auth.login', resourceType: 'user', resourceId: receptionistId, outcome: 'success', metadata: { fields: ['username'] } },
    { actorUserId: adminId, action: 'patient.create', resourceType: 'patient', resourceId: patients[0]!.id, outcome: 'success', metadata: { fields: ['firstName', 'lastName'] } },
    { actorUserId: receptionistId, action: 'appointment.create', resourceType: 'appointment', resourceId: appointments[0]!.id, outcome: 'success', metadata: { fields: ['startsAt', 'endsAt'] } },
    { actorUserId: receptionistId, action: 'appointment.update', resourceType: 'appointment', resourceId: appointments[1]?.id ?? appointments[0]!.id, outcome: 'success', metadata: { fields: ['reason'] } },
    { actorUserId: users[DEMO_USERNAMES.accountant]!.id, action: 'invoice.issue', resourceType: 'invoice', resourceId: null, outcome: 'success', metadata: { fields: ['status'] } },
    { actorUserId: adminId, action: 'user.create', resourceType: 'user', resourceId: users[DEMO_USERNAMES.nurse]!.id, outcome: 'success', metadata: { fields: ['username'], roles: ['nurse'] } },
    { actorUserId: adminId, action: 'attendance.create', resourceType: 'attendance', resourceId: null, outcome: 'success', metadata: { fields: ['status'] } },
    { actorUserId: adminId, action: 'leave.approve', resourceType: 'leave', resourceId: null, outcome: 'success', metadata: { from: 'pending', to: 'approved' } },
    { actorUserId: adminId, action: 'leave.reject', resourceType: 'leave', resourceId: null, outcome: 'success', metadata: { from: 'pending', to: 'rejected' } },
    { actorUserId: users[DEMO_USERNAMES.nurse]!.id, action: 'patient_document.create', resourceType: 'patient_document', resourceId: null, outcome: 'success', metadata: { fields: ['title', 'category'] } },
    { actorUserId: adminId, action: 'department.create', resourceType: 'department', resourceId: departments.GEN ?? null, outcome: 'success', metadata: { fields: ['code', 'name'] } },
    { actorUserId: receptionistId, action: 'auth.login', resourceType: 'user', resourceId: receptionistId, outcome: 'failure', metadata: { failedLoginCount: 1 } },
    { actorUserId: users[DEMO_USERNAMES.pharmacist]!.id, action: 'authorization.denied', resourceType: 'api_request', resourceId: null, outcome: 'denied', metadata: { permission: 'user.read' } },
  ]
  for (const event of events) {
    await writeAudit(event, tx)
    bump('auditLogs')
  }
}

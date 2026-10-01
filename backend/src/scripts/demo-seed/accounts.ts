export const DEMO_PASSWORD = 'HmsDemo@123'

export const DEMO_USERNAMES = {
  admin: 'admin',
  adminOps: 'admin.ops',
  doctor: 'doctor',
  doctorCardio: 'doctor.cardio',
  doctorPediatrics: 'doctor.pediatrics',
  doctorOrtho: 'doctor.ortho',
  doctorDerma: 'doctor.derma',
  nurse: 'nurse',
  reception: 'reception',
  lab: 'lab',
  pharmacist: 'pharmacist',
  accountant: 'accountant',
  receptionInactive: 'reception.inactive',
  nurseInactive: 'nurse.inactive',
} as const

export type DemoRoleCode =
  | 'administrator'
  | 'doctor'
  | 'nurse'
  | 'receptionist'
  | 'laboratory_staff'
  | 'pharmacist'
  | 'accountant'

export type DemoUserStatus = 'active' | 'disabled'

export type DemoAccountSpec = {
  label: string
  role: DemoRoleCode
  username: string
  status: DemoUserStatus
}

export type DemoAccount = DemoAccountSpec & {
  password: string
}

export const DEMO_ACCOUNTS: readonly DemoAccountSpec[] = [
  {
    label: 'Administrator',
    role: 'administrator',
    username: DEMO_USERNAMES.admin,
    status: 'active',
  },
  {
    label: 'Administrator operations',
    role: 'administrator',
    username: DEMO_USERNAMES.adminOps,
    status: 'active',
  },
  {
    label: 'Doctor',
    role: 'doctor',
    username: DEMO_USERNAMES.doctor,
    status: 'active',
  },
  {
    label: 'Cardiology doctor',
    role: 'doctor',
    username: DEMO_USERNAMES.doctorCardio,
    status: 'active',
  },
  {
    label: 'Pediatrics doctor',
    role: 'doctor',
    username: DEMO_USERNAMES.doctorPediatrics,
    status: 'active',
  },
  {
    label: 'Orthopedics doctor',
    role: 'doctor',
    username: DEMO_USERNAMES.doctorOrtho,
    status: 'active',
  },
  {
    label: 'Dermatology doctor',
    role: 'doctor',
    username: DEMO_USERNAMES.doctorDerma,
    status: 'active',
  },
  {
    label: 'Nurse',
    role: 'nurse',
    username: DEMO_USERNAMES.nurse,
    status: 'active',
  },
  {
    label: 'Receptionist',
    role: 'receptionist',
    username: DEMO_USERNAMES.reception,
    status: 'active',
  },
  {
    label: 'Laboratory Staff',
    role: 'laboratory_staff',
    username: DEMO_USERNAMES.lab,
    status: 'active',
  },
  {
    label: 'Pharmacist',
    role: 'pharmacist',
    username: DEMO_USERNAMES.pharmacist,
    status: 'active',
  },
  {
    label: 'Accountant',
    role: 'accountant',
    username: DEMO_USERNAMES.accountant,
    status: 'active',
  },
  {
    label: 'Inactive Receptionist',
    role: 'receptionist',
    username: DEMO_USERNAMES.receptionInactive,
    status: 'disabled',
  },
  {
    label: 'Inactive Nurse',
    role: 'nurse',
    username: DEMO_USERNAMES.nurseInactive,
    status: 'disabled',
  },
]

export function demoAccountsForSeed(): DemoAccount[] {
  return DEMO_ACCOUNTS.map((account) => ({
    ...account,
    password: DEMO_PASSWORD,
  }))
}

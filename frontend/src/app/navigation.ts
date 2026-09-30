import type { SvgIconComponent } from '@mui/icons-material'
import AssignmentIndOutlined from '@mui/icons-material/AssignmentIndOutlined'
import BadgeOutlined from '@mui/icons-material/BadgeOutlined'
import MedicalServicesOutlined from '@mui/icons-material/MedicalServicesOutlined'
import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined'
import DashboardOutlined from '@mui/icons-material/DashboardOutlined'
import DateRangeOutlined from '@mui/icons-material/DateRangeOutlined'
import EventNoteOutlined from '@mui/icons-material/EventNoteOutlined'
import FactCheckOutlined from '@mui/icons-material/FactCheckOutlined'
import HotelOutlined from '@mui/icons-material/HotelOutlined'
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined'
import LocalHospitalOutlined from '@mui/icons-material/LocalHospitalOutlined'
import MedicationOutlined from '@mui/icons-material/MedicationOutlined'
import MeetingRoomOutlined from '@mui/icons-material/MeetingRoomOutlined'
import PaymentsOutlined from '@mui/icons-material/PaymentsOutlined'
import PeopleOutlined from '@mui/icons-material/PeopleOutlined'
import ScienceOutlined from '@mui/icons-material/ScienceOutlined'
import SecurityOutlined from '@mui/icons-material/SecurityOutlined'
import SwapHorizOutlined from '@mui/icons-material/SwapHorizOutlined'
import AssessmentOutlined from '@mui/icons-material/AssessmentOutlined'
import ManageAccountsOutlined from '@mui/icons-material/ManageAccountsOutlined'
import type { CurrentUser } from '../api/auth'
import { hasAnyPermission, hasPermission } from '../auth/permission'
import { REPORT_PERMISSIONS } from '../features/reports/permissions'

export const DRAWER_WIDTH = 280
export const DRAWER_COLLAPSED_WIDTH = 72

export type NavPermission = string | null | 'reports.any'

export type NavItem = {
  label: string
  path: string
  permission: NavPermission
  description: string
  icon: SvgIconComponent
}

export type NavGroup = {
  id: string
  label: string
  items: readonly NavItem[]
}

export const navigationGroups: readonly NavGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      {
        label: 'Dashboard',
        path: '/',
        permission: null,
        description: 'View hospital activity, alerts, and summaries.',
        icon: DashboardOutlined,
      },
    ],
  },
  {
    id: 'patient-care',
    label: 'Patient care',
    items: [
      {
        label: 'Patients',
        path: '/patients',
        permission: 'patient.read',
        description: 'Register and manage patient demographic information and patient documents.',
        icon: PeopleOutlined,
      },
      {
        label: 'Appointments',
        path: '/appointments',
        permission: 'appointment.read',
        description: 'Book, manage, check in, complete, cancel, and reschedule outpatient appointments.',
        icon: EventNoteOutlined,
      },
      {
        label: 'Calendar',
        path: '/appointments/calendar',
        permission: 'appointment.read',
        description: 'View appointments by day, week, or month.',
        icon: CalendarMonthOutlined,
      },
      {
        label: 'Medical records',
        path: '/medical-records',
        permission: 'medical_record.read',
        description: 'Create, review, finalize, and manage authorized clinical records.',
        icon: AssignmentIndOutlined,
      },
      {
        label: 'Prescriptions',
        path: '/prescriptions',
        permission: 'prescription.read',
        description: 'Review authorized patient prescriptions and dispensing status.',
        icon: MedicationOutlined,
      },
      {
        label: 'Admissions',
        path: '/admissions',
        permission: 'admission.read',
        description: 'Record and review inpatient admissions.',
        icon: HotelOutlined,
      },
    ],
  },
  {
    id: 'pharmacy',
    label: 'Pharmacy',
    items: [
      {
        label: 'Medicines',
        path: '/medicines',
        permission: 'medicine.read',
        description: 'Manage the medicine catalogue used for prescriptions, receiving, and dispensing.',
        icon: LocalHospitalOutlined,
      },
      {
        label: 'Inventory',
        path: '/pharmacy/inventory',
        permission: 'inventory.read',
        description: 'Review pharmacy batches and available quantity.',
        icon: Inventory2Outlined,
      },
      {
        label: 'Stock movements',
        path: '/pharmacy/movements',
        permission: 'stock.movement.read',
        description: 'Review pharmacy stock movements.',
        icon: SwapHorizOutlined,
      },
    ],
  },
  {
    id: 'laboratory',
    label: 'Laboratory',
    items: [
      {
        label: 'Laboratory',
        path: '/laboratory',
        permission: 'lab_request.read',
        description: 'Manage laboratory requests, samples, results, and laboratory workflow.',
        icon: ScienceOutlined,
      },
    ],
  },
  {
    id: 'administration',
    label: 'Administration',
    items: [
      {
        label: 'Departments',
        path: '/departments',
        permission: 'department.read',
        description: 'Manage hospital departments used by staff and clinical assignment.',
        icon: MeetingRoomOutlined,
      },
      {
        label: 'Employees',
        path: '/employees',
        permission: 'employee.read',
        description: 'Register and manage employee records and department assignment.',
        icon: BadgeOutlined,
      },
      {
        label: 'Doctors',
        path: '/doctors',
        permission: 'doctor.read',
        description: 'Manage doctor profiles, specializations, and consulting schedules.',
        icon: MedicalServicesOutlined,
      },
      {
        label: 'Attendance',
        path: '/attendance',
        permission: 'attendance.read',
        description: 'Record and review employee attendance.',
        icon: FactCheckOutlined,
      },
      {
        label: 'Leave',
        path: '/leave',
        permission: 'leave.read',
        description: 'Submit, review, approve, reject, and manage employee leave.',
        icon: DateRangeOutlined,
      },
      {
        label: 'Users',
        path: '/users',
        permission: 'user.read',
        description: 'Manage system users, roles, account status, and authorized password resets.',
        icon: ManageAccountsOutlined,
      },
      {
        label: 'Audit',
        path: '/audit',
        permission: 'audit.read',
        description: 'Review security and operational audit records.',
        icon: SecurityOutlined,
      },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    items: [
      {
        label: 'Billing',
        path: '/billing',
        permission: 'invoice.read',
        description: 'Manage invoices, payments, charges, and payment reversals.',
        icon: PaymentsOutlined,
      },
      {
        label: 'Reports',
        path: '/reports',
        permission: 'reports.any',
        description: 'Review operational and financial reports available to your role.',
        icon: AssessmentOutlined,
      },
    ],
  },
] as const

export function canSeeNavItem(user: CurrentUser | null, item: NavItem): boolean {
  if (item.permission === null) return true
  if (item.permission === 'reports.any') {
    return hasAnyPermission(user, REPORT_PERMISSIONS)
  }
  return hasPermission(user, item.permission)
}

export function visibleNavigation(user: CurrentUser | null): NavGroup[] {
  return navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canSeeNavItem(user, item)),
    }))
    .filter((group) => group.items.length > 0)
}

export function isNavItemActive(path: string, pathname: string): boolean {
  if (path === '/') return pathname === '/'
  if (path === '/appointments') {
    return pathname === '/appointments' || (
      pathname.startsWith('/appointments/') &&
      !pathname.startsWith('/appointments/calendar')
    )
  }
  return pathname === path || pathname.startsWith(`${path}/`)
}

export function currentNavItem(pathname: string): NavItem | undefined {
  const items = navigationGroups.flatMap((group) => group.items)
  const matches = items.filter((item) => isNavItemActive(item.path, pathname))
  return matches.sort((a, b) => b.path.length - a.path.length)[0]
}

export const pageTitles: Record<string, string> = {
  '/change-password': 'Change password',
}

export function resolvePageTitle(pathname: string): string {
  const exact = pageTitles[pathname]
  if (exact) return exact
  return currentNavItem(pathname)?.label ?? 'HMS'
}

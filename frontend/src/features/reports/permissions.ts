export const REPORT_PERMISSIONS = [
  'report.patient.read',
  'report.appointment.read',
  'report.revenue.read',
  'report.pharmacy.read',
  'report.laboratory.read',
  'report.staff.read',
] as const

export const reportLinks = [
  {
    permission: 'report.patient.read',
    path: '/reports/patients',
    label: 'Patient report',
    description: 'Registered patients using administrative identifiers.',
  },
  {
    permission: 'report.appointment.read',
    path: '/reports/appointments',
    label: 'Appointment report',
    description: 'Appointments in a hospital-local date range.',
  },
  {
    permission: 'report.revenue.read',
    path: '/reports/revenue',
    label: 'Revenue report',
    description: 'Effective payments against non-void invoices.',
  },
  {
    permission: 'report.pharmacy.read',
    path: '/reports/pharmacy',
    label: 'Pharmacy report',
    description: 'Low-stock medicines and near-expiry batches.',
  },
  {
    permission: 'report.laboratory.read',
    path: '/reports/laboratory',
    label: 'Laboratory report',
    description: 'Laboratory requests and test statuses.',
  },
  {
    permission: 'report.staff.read',
    path: '/reports/staff',
    label: 'Staff report',
    description: 'Employees, departments, and doctor master data.',
  },
] as const

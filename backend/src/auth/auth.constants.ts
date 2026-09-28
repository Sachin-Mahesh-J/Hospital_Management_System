export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60
export const REFRESH_ABSOLUTE_TTL_MS = 7 * 24 * 60 * 60 * 1000
export const REFRESH_IDLE_TTL_MS = 30 * 60 * 1000
export const TEMPORARY_LOCK_MS = 15 * 60 * 1000
export const FAILED_LOGIN_LIMIT = 5

export const AUTH_CSRF_HEADER = 'x-hms-csrf'
export const AUTH_CSRF_VALUE = '1'
export const REFRESH_COOKIE_PATH = '/api/v1/auth'

export const PERMISSIONS = {
  identitySelfRead: 'identity.self.read',
  identityPasswordChange: 'identity.password.change',
  patientRead: 'patient.read',
  patientCreate: 'patient.create',
  patientUpdate: 'patient.update',
  departmentRead: 'department.read',
  departmentCreate: 'department.create',
  departmentUpdate: 'department.update',
  employeeRead: 'employee.read',
  employeeCreate: 'employee.create',
  employeeUpdate: 'employee.update',
  doctorRead: 'doctor.read',
  doctorCreate: 'doctor.create',
  doctorUpdate: 'doctor.update',
  doctorScheduleRead: 'doctor_schedule.read',
  doctorScheduleCreate: 'doctor_schedule.create',
  doctorScheduleUpdate: 'doctor_schedule.update',
  appointmentRead: 'appointment.read',
  appointmentCreate: 'appointment.create',
  appointmentUpdate: 'appointment.update',
  appointmentCancel: 'appointment.cancel',
  appointmentReschedule: 'appointment.reschedule',
  appointmentStatusUpdate: 'appointment.status.update',
} as const

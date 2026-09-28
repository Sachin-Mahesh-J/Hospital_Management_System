export const appointmentStatuses = [
  'scheduled',
  'checked_in',
  'completed',
  'cancelled',
  'no_show',
] as const

export type AppointmentStatus = (typeof appointmentStatuses)[number]

export const appointmentStatusActions = [
  'checked_in',
  'completed',
  'no_show',
] as const

export type AppointmentStatusAction = (typeof appointmentStatusActions)[number]

export const allowedStatusTransitions: Record<
  AppointmentStatus,
  readonly AppointmentStatusAction[]
> = {
  scheduled: ['checked_in', 'no_show'],
  checked_in: ['completed'],
  completed: [],
  cancelled: [],
  no_show: [],
}

export type AppointmentPatient = {
  id: string
  patientNumber: string
  firstName: string
  lastName: string
  status: string
}

export type AppointmentDoctor = {
  id: string
  licenseNumber: string
  specialization: string
  status: string
  employee: {
    id: string
    employeeNumber: string
    firstName: string
    lastName: string
    employmentStatus: string
  }
}

export type AppointmentRelation = {
  id: string
  status: AppointmentStatus
  startsAt: string
  endsAt: string
}

export type Appointment = {
  id: string
  patientId: string
  doctorId: string
  startsAt: string
  endsAt: string
  status: AppointmentStatus
  reason: string | null
  cancellationReason: string | null
  cancelledAt: string | null
  cancelledByUserId: string | null
  rescheduledFromAppointmentId: string | null
  createdByUserId: string
  createdAt: string
  updatedAt: string
  patient: AppointmentPatient
  doctor: AppointmentDoctor
  cancelledBy: { id: string; username: string } | null
  createdBy: { id: string; username: string }
  rescheduledFrom: AppointmentRelation | null
  rescheduledTo: AppointmentRelation | null
}

export type AppointmentInput = {
  patientId: string
  doctorId: string
  startsAt: string
  endsAt: string
  reason?: string | null
}

export type AppointmentUpdate = {
  reason: string | null
}

export type AppointmentRescheduleInput = {
  patientId?: string
  doctorId: string
  startsAt: string
  endsAt: string
  reason?: string | null
}

export type AppointmentFilters = {
  page: number
  pageSize: number
  patientId?: string
  doctorId?: string
  status?: AppointmentStatus
  startsAtFrom?: string
  startsAtTo?: string
  sortBy?: 'startsAt' | 'endsAt' | 'status' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

export type AppointmentListResult = {
  data: Appointment[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}

export function canCancelAppointment(status: AppointmentStatus): boolean {
  return status === 'scheduled' || status === 'checked_in'
}

export function canRescheduleAppointment(status: AppointmentStatus): boolean {
  return status === 'scheduled' || status === 'checked_in'
}

export function patientLabel(patient: AppointmentPatient): string {
  return `${patient.firstName} ${patient.lastName} (${patient.patientNumber})`
}

export function doctorLabel(doctor: AppointmentDoctor): string {
  return `${doctor.employee.firstName} ${doctor.employee.lastName}`
}

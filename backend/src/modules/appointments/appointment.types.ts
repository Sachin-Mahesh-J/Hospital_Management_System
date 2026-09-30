import type {
  Appointment,
  DoctorProfile,
  Employee,
  Patient,
} from '@prisma/client'

export type AppointmentRecord = Appointment & {
  patient: Patient
  doctor: DoctorProfile & { employee: Employee }
  cancelledBy: { id: string; username: string } | null
  createdBy: { id: string; username: string }
  rescheduledFrom: {
    id: string
    status: string
    startsAt: Date
    endsAt: Date
  } | null
  rescheduledTo: {
    id: string
    status: string
    startsAt: Date
    endsAt: Date
  } | null
}

export type AppointmentDto = {
  id: string
  patientId: string
  doctorId: string
  startsAt: string
  endsAt: string
  status: string
  reason: string | null
  cancellationReason: string | null
  cancelledAt: string | null
  cancelledByUserId: string | null
  rescheduledFromAppointmentId: string | null
  createdByUserId: string
  createdAt: string
  updatedAt: string
  patient: {
    id: string
    patientNumber: string
    firstName: string
    lastName: string
    status: string
  }
  doctor: {
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
  cancelledBy: { id: string; username: string } | null
  createdBy: { id: string; username: string }
  rescheduledFrom: {
    id: string
    status: string
    startsAt: string
    endsAt: string
  } | null
  rescheduledTo: {
    id: string
    status: string
    startsAt: string
    endsAt: string
  } | null
  overlapsApprovedLeave: boolean
}

function relatedInterval(row: {
  id: string
  status: string
  startsAt: Date
  endsAt: Date
}) {
  return {
    id: row.id,
    status: row.status,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
  }
}

export function toAppointmentDto(
  appointment: AppointmentRecord,
  overlapsApprovedLeave = false,
): AppointmentDto {
  return {
    id: appointment.id,
    patientId: appointment.patientId,
    doctorId: appointment.doctorId,
    startsAt: appointment.startsAt.toISOString(),
    endsAt: appointment.endsAt.toISOString(),
    status: appointment.status,
    reason: appointment.reason,
    cancellationReason: appointment.cancellationReason,
    cancelledAt: appointment.cancelledAt?.toISOString() ?? null,
    cancelledByUserId: appointment.cancelledByUserId,
    rescheduledFromAppointmentId: appointment.rescheduledFromAppointmentId,
    createdByUserId: appointment.createdByUserId,
    createdAt: appointment.createdAt.toISOString(),
    updatedAt: appointment.updatedAt.toISOString(),
    patient: {
      id: appointment.patient.id,
      patientNumber: appointment.patient.patientNumber,
      firstName: appointment.patient.firstName,
      lastName: appointment.patient.lastName,
      status: appointment.patient.status,
    },
    doctor: {
      id: appointment.doctor.id,
      licenseNumber: appointment.doctor.licenseNumber,
      specialization: appointment.doctor.specialization,
      status: appointment.doctor.status,
      employee: {
        id: appointment.doctor.employee.id,
        employeeNumber: appointment.doctor.employee.employeeNumber,
        firstName: appointment.doctor.employee.firstName,
        lastName: appointment.doctor.employee.lastName,
        employmentStatus: appointment.doctor.employee.employmentStatus,
      },
    },
    cancelledBy: appointment.cancelledBy,
    createdBy: appointment.createdBy,
    rescheduledFrom: appointment.rescheduledFrom
      ? relatedInterval(appointment.rescheduledFrom)
      : null,
    rescheduledTo: appointment.rescheduledTo
      ? relatedInterval(appointment.rescheduledTo)
      : null,
    overlapsApprovedLeave,
  }
}

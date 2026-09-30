import type { AttendanceRecord, Employee } from '@prisma/client'
import { calendarDateUtc } from '../../config/hospitalTime.js'

export type AttendanceRecordRow = AttendanceRecord & {
  employee: Pick<
    Employee,
    | 'id'
    | 'employeeNumber'
    | 'firstName'
    | 'lastName'
    | 'employmentStatus'
  >
}

export type AttendanceDto = {
  id: string
  employeeId: string
  workDate: string
  checkInAt: string | null
  checkOutAt: string | null
  status: string
  note: string | null
  recordedByUserId: string | null
  createdAt: string
  updatedAt: string
  employee: {
    id: string
    employeeNumber: string
    firstName: string
    lastName: string
    employmentStatus: string
  }
}

export function toAttendanceDto(record: AttendanceRecordRow): AttendanceDto {
  return {
    id: record.id,
    employeeId: record.employeeId,
    workDate: calendarDateUtc(record.workDate),
    checkInAt: record.checkInAt?.toISOString() ?? null,
    checkOutAt: record.checkOutAt?.toISOString() ?? null,
    status: record.status,
    note: record.note,
    recordedByUserId: record.recordedByUserId,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    employee: {
      id: record.employee.id,
      employeeNumber: record.employee.employeeNumber,
      firstName: record.employee.firstName,
      lastName: record.employee.lastName,
      employmentStatus: record.employee.employmentStatus,
    },
  }
}

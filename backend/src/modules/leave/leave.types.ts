import type { Employee, LeaveRecord } from '@prisma/client'
import { calendarDateUtc } from '../../config/hospitalTime.js'

export type LeaveRecordRow = LeaveRecord & {
  employee: Pick<
    Employee,
    | 'id'
    | 'employeeNumber'
    | 'firstName'
    | 'lastName'
    | 'employmentStatus'
    | 'userId'
  >
  decidedBy: { id: string; username: string } | null
}

export type LeaveDto = {
  id: string
  employeeId: string
  startsOn: string
  endsOn: string
  leaveType: string
  reason: string | null
  status: string
  decidedByUserId: string | null
  decidedAt: string | null
  decisionNote: string | null
  createdAt: string
  updatedAt: string
  employee: {
    id: string
    employeeNumber: string
    firstName: string
    lastName: string
    employmentStatus: string
  }
  decidedBy: { id: string; username: string } | null
}

export function toLeaveDto(record: LeaveRecordRow): LeaveDto {
  return {
    id: record.id,
    employeeId: record.employeeId,
    startsOn: calendarDateUtc(record.startsOn),
    endsOn: calendarDateUtc(record.endsOn),
    leaveType: record.leaveType,
    reason: record.reason,
    status: record.status,
    decidedByUserId: record.decidedByUserId,
    decidedAt: record.decidedAt?.toISOString() ?? null,
    decisionNote: record.decisionNote,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    employee: {
      id: record.employee.id,
      employeeNumber: record.employee.employeeNumber,
      firstName: record.employee.firstName,
      lastName: record.employee.lastName,
      employmentStatus: record.employee.employmentStatus,
    },
    decidedBy: record.decidedBy,
  }
}

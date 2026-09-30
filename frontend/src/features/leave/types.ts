export const leaveStatuses = [
  'pending',
  'approved',
  'rejected',
  'cancelled',
] as const
export type LeaveStatus = (typeof leaveStatuses)[number]

export type LeaveRecord = {
  id: string
  employeeId: string
  startsOn: string
  endsOn: string
  leaveType: string
  reason: string | null
  status: LeaveStatus
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

export type LeaveInput = {
  leaveType: string
  startsOn: string
  endsOn: string
  reason?: string | null
}

export type LeaveUpdate = Partial<LeaveInput>

export type LeaveFilters = {
  page: number
  pageSize: number
  employeeId?: string
  status?: LeaveStatus
  overlapsFrom?: string
  overlapsTo?: string
}

export type LeaveListResult = {
  data: LeaveRecord[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}

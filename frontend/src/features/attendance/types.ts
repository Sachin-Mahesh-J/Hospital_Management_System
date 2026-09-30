export const attendanceStatuses = ['present', 'absent', 'leave'] as const
export type AttendanceStatus = (typeof attendanceStatuses)[number]

export type Attendance = {
  id: string
  employeeId: string
  workDate: string
  checkInAt: string | null
  checkOutAt: string | null
  status: AttendanceStatus
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

export type AttendanceInput = {
  employeeId: string
  workDate: string
  status: AttendanceStatus
  checkInAt?: string | null
  checkOutAt?: string | null
  note?: string | null
}

export type AttendanceUpdate = Partial<Omit<AttendanceInput, 'employeeId' | 'workDate'>>

export type AttendanceFilters = {
  page: number
  pageSize: number
  employeeId?: string
  status?: AttendanceStatus
  workDateFrom?: string
  workDateTo?: string
}

export type AttendanceListResult = {
  data: Attendance[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}

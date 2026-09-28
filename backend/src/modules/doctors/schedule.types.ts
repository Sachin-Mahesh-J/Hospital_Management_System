import type { DoctorSchedule } from '@prisma/client'

export type ScheduleDto = {
  id: string
  doctorId: string
  startsAt: string
  endsAt: string
  status: string
  note: string | null
  createdAt: string
  updatedAt: string
}

export function toScheduleDto(schedule: DoctorSchedule): ScheduleDto {
  return {
    id: schedule.id,
    doctorId: schedule.doctorId,
    startsAt: schedule.startsAt.toISOString(),
    endsAt: schedule.endsAt.toISOString(),
    status: schedule.status,
    note: schedule.note,
    createdAt: schedule.createdAt.toISOString(),
    updatedAt: schedule.updatedAt.toISOString(),
  }
}

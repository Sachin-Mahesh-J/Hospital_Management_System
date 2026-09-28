import type { Department, DoctorProfile, Employee } from '@prisma/client'
import { toEmployeeDto, type EmployeeDto } from '../employees/employee.types.js'

export type DoctorRecord = DoctorProfile & {
  employee: Employee & { department: Department }
}

export type DoctorDto = {
  id: string
  employeeId: string
  employee: EmployeeDto
  licenseNumber: string
  specialization: string
  professionalSummary: string | null
  contactExtension: string | null
  status: string
  createdAt: string
  updatedAt: string
}

export function toDoctorDto(doctor: DoctorRecord): DoctorDto {
  return {
    id: doctor.id,
    employeeId: doctor.employeeId,
    employee: toEmployeeDto(doctor.employee),
    licenseNumber: doctor.licenseNumber,
    specialization: doctor.specialization,
    professionalSummary: doctor.professionalSummary,
    contactExtension: doctor.contactExtension,
    status: doctor.status,
    createdAt: doctor.createdAt.toISOString(),
    updatedAt: doctor.updatedAt.toISOString(),
  }
}

import { database } from '../../database/database.service.js'
import { isUniqueConstraint } from '../../database/prismaErrors.js'
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../errors/httpErrors.js'
import { writeAudit } from '../audit/audit.service.js'
import {
  createDoctor as createDoctorRecord,
  findDoctorById,
  findEmployeeForDoctor,
  listDoctors as listDoctorRecords,
  updateDoctor as updateDoctorRecord,
} from './doctor.repository.js'
import type {
  CreateDoctorBody,
  ListDoctorsQuery,
  UpdateDoctorBody,
} from './doctor.schemas.js'
import { toDoctorDto, type DoctorDto } from './doctor.types.js'

type MutationContext = {
  actorUserId: string
  requestId: string
}

function mapDoctorConflict(error: unknown): never {
  if (
    isUniqueConstraint(error, [
      'uq_doctor_profiles_employee_id',
      'employee_id',
    ])
  ) {
    throw new ConflictError('This employee already has a doctor profile.')
  }
  if (
    isUniqueConstraint(error, [
      'uq_doctor_profiles_license_number',
      'license_number',
    ])
  ) {
    throw new ConflictError('A doctor with this license number already exists.')
  }
  throw error
}

async function assertEligibleEmployee(
  employeeId: string,
  client: Parameters<typeof findEmployeeForDoctor>[1],
): Promise<void> {
  const employee = await findEmployeeForDoctor(employeeId, client)
  if (!employee) {
    throw new ValidationError('The referenced employee was not found.', [
      { path: 'employeeId', message: 'Employee does not exist.' },
    ])
  }
  if (employee.doctorProfile) {
    throw new ConflictError('This employee already has a doctor profile.')
  }
}

export async function getDoctors(query: ListDoctorsQuery): Promise<{
  data: DoctorDto[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}> {
  const result = await listDoctorRecords(query)
  return {
    data: result.doctors.map(toDoctorDto),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      totalItems: result.totalItems,
      totalPages: Math.ceil(result.totalItems / query.pageSize),
    },
  }
}

export async function getDoctor(id: string): Promise<DoctorDto> {
  const doctor = await findDoctorById(id)
  if (!doctor) throw new NotFoundError('Doctor was not found.')
  return toDoctorDto(doctor)
}

export async function registerDoctor(
  input: CreateDoctorBody,
  context: MutationContext,
): Promise<DoctorDto> {
  try {
    const doctor = await database.client.$transaction(async (transaction) => {
      await assertEligibleEmployee(input.employeeId, transaction)
      const created = await createDoctorRecord(input, transaction)
      await writeAudit(
        {
          actorUserId: context.actorUserId,
          action: 'doctor.create',
          resourceType: 'doctor',
          resourceId: created.id,
          outcome: 'success',
          requestId: context.requestId,
          metadata: { fields: Object.keys(input).sort() },
        },
        transaction,
      )
      return created
    })
    return toDoctorDto(doctor)
  } catch (error) {
    mapDoctorConflict(error)
  }
}

export async function changeDoctor(
  id: string,
  input: UpdateDoctorBody,
  context: MutationContext,
): Promise<DoctorDto> {
  try {
    const doctor = await database.client.$transaction(async (transaction) => {
      const existing = await findDoctorById(id, transaction)
      if (!existing) throw new NotFoundError('Doctor was not found.')

      const updated = await updateDoctorRecord(id, input, transaction)
      const statusChanged =
        input.status !== undefined && input.status !== existing.status
      await writeAudit(
        {
          actorUserId: context.actorUserId,
          action: statusChanged ? 'doctor.status_update' : 'doctor.update',
          resourceType: 'doctor',
          resourceId: id,
          outcome: 'success',
          requestId: context.requestId,
          metadata: { fields: Object.keys(input).sort(), statusChanged },
        },
        transaction,
      )
      return updated
    })
    return toDoctorDto(doctor)
  } catch (error) {
    mapDoctorConflict(error)
  }
}

import { Prisma } from '@prisma/client'
import { database } from '../../database/database.service.js'
import type {
  CreateDoctorBody,
  ListDoctorsQuery,
  UpdateDoctorBody,
} from './doctor.schemas.js'
import type { DoctorRecord } from './doctor.types.js'

type DoctorClient = Pick<Prisma.TransactionClient, 'doctorProfile' | 'employee'>

function clientOrDefault(client?: DoctorClient): DoctorClient {
  return client ?? database.client
}

const doctorInclude = {
  employee: { include: { department: true } },
} as const

function doctorOrderBy(
  query: ListDoctorsQuery,
): Prisma.DoctorProfileOrderByWithRelationInput[] {
  if (query.sortBy === 'lastName' || query.sortBy === 'firstName') {
    return [
      { employee: { [query.sortBy]: query.sortOrder } },
      { id: 'asc' },
    ]
  }
  return [{ [query.sortBy]: query.sortOrder }, { id: 'asc' }]
}

function doctorWhere(query: ListDoctorsQuery): Prisma.DoctorProfileWhereInput {
  const search = query.search?.trim()
  return {
    ...(query.status ? { status: query.status } : {}),
    ...(query.departmentId || query.employmentStatus
      ? {
          employee: {
            ...(query.departmentId
              ? { departmentId: query.departmentId }
              : {}),
            ...(query.employmentStatus
              ? { employmentStatus: query.employmentStatus }
              : {}),
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { licenseNumber: { contains: search, mode: 'insensitive' } },
            { specialization: { contains: search, mode: 'insensitive' } },
            {
              employee: {
                OR: [
                  {
                    employeeNumber: {
                      contains: search,
                      mode: 'insensitive',
                    },
                  },
                  { firstName: { contains: search, mode: 'insensitive' } },
                  { lastName: { contains: search, mode: 'insensitive' } },
                ],
              },
            },
          ],
        }
      : {}),
  }
}

export async function listDoctors(query: ListDoctorsQuery): Promise<{
  doctors: DoctorRecord[]
  totalItems: number
}> {
  const where = doctorWhere(query)
  const totalItems = await database.client.doctorProfile.count({ where })
  const offset = (query.page - 1) * query.pageSize
  const doctors =
    offset >= totalItems
      ? []
      : await database.client.doctorProfile.findMany({
          where,
          skip: offset,
          take: query.pageSize,
          include: doctorInclude,
          orderBy: doctorOrderBy(query),
        })
  return { doctors, totalItems }
}

export function findDoctorById(
  id: string,
  client?: DoctorClient,
): Promise<DoctorRecord | null> {
  return clientOrDefault(client).doctorProfile.findUnique({
    where: { id },
    include: doctorInclude,
  })
}

export function findEmployeeForDoctor(
  id: string,
  client?: DoctorClient,
) {
  return clientOrDefault(client).employee.findUnique({
    where: { id },
    include: { doctorProfile: { select: { id: true } } },
  })
}

export function createDoctor(
  input: CreateDoctorBody,
  client?: DoctorClient,
): Promise<DoctorRecord> {
  return clientOrDefault(client).doctorProfile.create({
    data: {
      employeeId: input.employeeId,
      licenseNumber: input.licenseNumber,
      specialization: input.specialization,
      professionalSummary: input.professionalSummary ?? null,
      contactExtension: input.contactExtension ?? null,
      status: input.status ?? 'active',
    },
    include: doctorInclude,
  })
}

export function updateDoctor(
  id: string,
  input: UpdateDoctorBody,
  client?: DoctorClient,
): Promise<DoctorRecord> {
  const data: Prisma.DoctorProfileUpdateInput = { updatedAt: new Date() }
  if (input.licenseNumber !== undefined) data.licenseNumber = input.licenseNumber
  if (input.specialization !== undefined) {
    data.specialization = input.specialization
  }
  if (input.professionalSummary !== undefined) {
    data.professionalSummary = input.professionalSummary
  }
  if (input.contactExtension !== undefined) {
    data.contactExtension = input.contactExtension
  }
  if (input.status !== undefined) data.status = input.status
  return clientOrDefault(client).doctorProfile.update({
    where: { id },
    data,
    include: doctorInclude,
  })
}

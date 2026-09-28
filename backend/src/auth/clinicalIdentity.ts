import type { Prisma } from '@prisma/client'
import { database } from '../database/database.service.js'

type IdentityClient = Pick<Prisma.TransactionClient, 'employee' | 'doctorProfile'>

function clientOrDefault(client?: IdentityClient): IdentityClient {
  return client ?? database.client
}

export function findEmployeeByUserId(
  userId: string,
  client?: IdentityClient,
) {
  return clientOrDefault(client).employee.findUnique({
    where: { userId },
    select: {
      id: true,
      employmentStatus: true,
      doctorProfile: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  })
}

export function findPrescribingDoctorByUserId(
  userId: string,
  client?: IdentityClient,
) {
  return clientOrDefault(client).doctorProfile.findFirst({
    where: { employee: { userId } },
    select: {
      id: true,
      status: true,
      employee: {
        select: {
          id: true,
          employmentStatus: true,
        },
      },
    },
  })
}

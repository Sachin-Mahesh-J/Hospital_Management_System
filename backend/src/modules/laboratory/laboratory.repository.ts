import { Prisma } from '@prisma/client'
import { database } from '../../database/database.service.js'
import type {
  CreateLabRequestBody,
  EnterLabResultBody,
  ListLabRequestsQuery,
  ListLabTestsQuery,
} from './laboratory.schemas.js'
import type { LabRequestRecord } from './laboratory.types.js'

type LaboratoryClient = Prisma.TransactionClient

function clientOrDefault(client?: LaboratoryClient): LaboratoryClient {
  return client ?? database.client
}

const labRequestInclude = {
  patient: true,
  requestedBy: { include: { employee: true } },
  medicalRecord: { select: { id: true, status: true, patientId: true } },
  items: {
    include: {
      testDefinition: true,
      sampleCollectedBy: true,
      results: {
        include: { enteredBy: true },
        orderBy: { versionNumber: 'asc' as const },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
} as const

function listWhere(
  query: ListLabRequestsQuery,
): Prisma.LabRequestWhereInput {
  return {
    ...(query.patientId ? { patientId: query.patientId } : {}),
    ...(query.requestedByDoctorId
      ? { requestedByDoctorId: query.requestedByDoctorId }
      : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.requestedAtFrom || query.requestedAtTo
      ? {
          requestedAt: {
            ...(query.requestedAtFrom
              ? { gte: new Date(query.requestedAtFrom) }
              : {}),
            ...(query.requestedAtTo
              ? { lt: new Date(query.requestedAtTo) }
              : {}),
          },
        }
      : {}),
  }
}

export async function listActiveLabTests(query: ListLabTestsQuery) {
  const where: Prisma.LabTestDefinitionWhereInput = {
    status: 'active',
    ...(query.search
      ? {
          OR: [
            { code: { contains: query.search, mode: 'insensitive' } },
            { name: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  }
  const totalItems = await database.client.labTestDefinition.count({ where })
  const offset = (query.page - 1) * query.pageSize
  const tests =
    offset >= totalItems
      ? []
      : await database.client.labTestDefinition.findMany({
          where,
          skip: offset,
          take: query.pageSize,
          orderBy: [{ [query.sortBy]: query.sortOrder }, { id: 'asc' }],
        })
  return { tests, totalItems }
}

export async function listLabRequests(
  query: ListLabRequestsQuery,
): Promise<{ requests: LabRequestRecord[]; totalItems: number }> {
  const where = listWhere(query)
  const totalItems = await database.client.labRequest.count({ where })
  const offset = (query.page - 1) * query.pageSize
  const requests =
    offset >= totalItems
      ? []
      : await database.client.labRequest.findMany({
          where,
          skip: offset,
          take: query.pageSize,
          include: labRequestInclude,
          orderBy: [{ [query.sortBy]: query.sortOrder }, { id: 'asc' }],
        })
  return { requests, totalItems }
}

export function findLabRequestById(
  id: string,
  client?: LaboratoryClient,
): Promise<LabRequestRecord | null> {
  return clientOrDefault(client).labRequest.findUnique({
    where: { id },
    include: labRequestInclude,
  })
}

export function findPatientById(id: string, client?: LaboratoryClient) {
  return clientOrDefault(client).patient.findUnique({
    where: { id },
    select: { id: true, status: true },
  })
}

export function findMedicalRecordById(
  id: string,
  client?: LaboratoryClient,
) {
  return clientOrDefault(client).medicalRecord.findUnique({
    where: { id },
    select: { id: true, status: true, patientId: true },
  })
}

export function findLabTestDefinitionById(
  id: string,
  client?: LaboratoryClient,
) {
  return clientOrDefault(client).labTestDefinition.findUnique({
    where: { id },
    select: { id: true, status: true },
  })
}

export function createLabRequest(
  input: CreateLabRequestBody,
  requestedByDoctorId: string,
  client?: LaboratoryClient,
): Promise<LabRequestRecord> {
  return clientOrDefault(client).labRequest.create({
    data: {
      patientId: input.patientId,
      requestedByDoctorId,
      medicalRecordId: input.medicalRecordId ?? null,
      status: 'requested',
      clinicalNote: input.clinicalNote ?? null,
      items: {
        create: input.items.map((item) => ({
          testDefinitionId: item.testDefinitionId,
          status: 'requested',
        })),
      },
    },
    include: labRequestInclude,
  })
}

export async function lockLabRequest(
  id: string,
  client: Prisma.TransactionClient,
): Promise<{ id: string; status: string } | null> {
  const rows = await client.$queryRaw<Array<{ id: string; status: string }>>`
    SELECT "id", "status"
    FROM "lab_requests"
    WHERE "id" = ${id}::uuid
    FOR UPDATE
  `
  return rows[0] ?? null
}

export function lockLabRequestItems(
  labRequestId: string,
  client: Prisma.TransactionClient,
): Promise<Array<{ id: string; status: string }>> {
  return client.$queryRaw<Array<{ id: string; status: string }>>`
    SELECT "id", "status"
    FROM "lab_request_items"
    WHERE "lab_request_id" = ${labRequestId}::uuid
    ORDER BY "created_at" ASC
    FOR UPDATE
  `
}

export function countLabResults(
  labRequestItemId: string,
  client?: LaboratoryClient,
) {
  return clientOrDefault(client).labResult.count({
    where: { labRequestItemId },
  })
}

export async function collectLabRequestItem(
  itemId: string,
  requestId: string,
  parentStatus: string,
  collectorEmployeeId: string,
  collectedAt: Date,
  client: Prisma.TransactionClient,
): Promise<LabRequestRecord> {
  await client.labRequestItem.update({
    where: { id: itemId },
    data: {
      status: 'sample_collected',
      sampleCollectedAt: collectedAt,
      sampleCollectedByEmployeeId: collectorEmployeeId,
      updatedAt: collectedAt,
    },
  })
  await client.labRequest.update({
    where: { id: requestId },
    data: {
      status: parentStatus,
      updatedAt: collectedAt,
    },
  })
  const request = await findLabRequestById(requestId, client)
  if (!request) {
    throw new Error('Laboratory request was not found after collection.')
  }
  return request
}

export async function enterLabResult(
  itemId: string,
  requestId: string,
  parentStatus: string,
  input: EnterLabResultBody,
  enteredByEmployeeId: string,
  enteredAt: Date,
  client: Prisma.TransactionClient,
): Promise<LabRequestRecord> {
  await client.labResult.create({
    data: {
      labRequestItemId: itemId,
      versionNumber: 1,
      resultValue: input.resultValue,
      resultUnit: input.resultUnit ?? null,
      referenceRangeSnapshot: input.referenceRangeSnapshot ?? null,
      resultNote: input.resultNote ?? null,
      enteredByEmployeeId,
      enteredAt,
    },
  })
  await client.labRequestItem.update({
    where: { id: itemId },
    data: {
      status: 'completed',
      updatedAt: enteredAt,
    },
  })
  await client.labRequest.update({
    where: { id: requestId },
    data: {
      status: parentStatus,
      updatedAt: enteredAt,
    },
  })
  const request = await findLabRequestById(requestId, client)
  if (!request) {
    throw new Error('Laboratory request was not found after result entry.')
  }
  return request
}

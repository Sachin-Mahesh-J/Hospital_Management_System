import type { Prisma } from '@prisma/client'
import {
  findEmployeeByUserId,
  findPrescribingDoctorByUserId,
} from '../../auth/clinicalIdentity.js'
import { database } from '../../database/database.service.js'
import {
  ConflictError,
  NotFoundError,
} from '../../errors/httpErrors.js'
import { writeAudit } from '../audit/audit.service.js'
import { aggregateLabRequestStatus } from './laboratory.lifecycle.js'
import {
  collectLabRequestItem,
  countLabResults,
  createLabRequest as createLabRequestRecord,
  enterLabResult as enterLabResultRecord,
  findLabRequestById,
  findLabTestDefinitionById,
  findMedicalRecordById,
  findPatientById,
  listActiveLabTests,
  listLabRequests as listLabRequestRows,
  lockLabRequest,
  lockLabRequestItems,
} from './laboratory.repository.js'
import type {
  CreateLabRequestBody,
  EnterLabResultBody,
  ListLabRequestsQuery,
  ListLabTestsQuery,
} from './laboratory.schemas.js'
import {
  toLabRequestDetailDto,
  toLabRequestListDto,
  toLabTestCatalogDto,
  type LabRequestDetailDto,
  type LabRequestListDto,
  type LabTestCatalogDto,
} from './laboratory.types.js'

type MutationContext = {
  actorUserId: string
  requestId: string
}

type Pagination = {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

function paginationFor(page: number, pageSize: number, totalItems: number): Pagination {
  return {
    page,
    pageSize,
    totalItems,
    totalPages: Math.ceil(totalItems / pageSize),
  }
}

async function requireActiveRequestingDoctor(
  userId: string,
  client: Prisma.TransactionClient,
): Promise<string> {
  const doctor = await findPrescribingDoctorByUserId(userId, client)
  if (!doctor) {
    throw new ConflictError(
      'The authenticated user is not linked to an active doctor profile.',
    )
  }
  if (doctor.status !== 'active') {
    throw new ConflictError('This doctor is not available for laboratory requests.')
  }
  if (doctor.employee.employmentStatus !== 'active') {
    throw new ConflictError('This doctor is not available for laboratory requests.')
  }
  return doctor.id
}

async function requireActiveEmployee(
  userId: string,
  client: Prisma.TransactionClient,
): Promise<string> {
  const employee = await findEmployeeByUserId(userId, client)
  if (!employee) {
    throw new ConflictError(
      'The authenticated user is not linked to an employee record.',
    )
  }
  if (employee.employmentStatus !== 'active') {
    throw new ConflictError('This employee is not available for laboratory work.')
  }
  return employee.id
}

export async function getActiveLabTests(query: ListLabTestsQuery): Promise<{
  data: LabTestCatalogDto[]
  pagination: Pagination
}> {
  const result = await listActiveLabTests(query)
  return {
    data: result.tests.map(toLabTestCatalogDto),
    pagination: paginationFor(query.page, query.pageSize, result.totalItems),
  }
}

export async function getLabRequests(query: ListLabRequestsQuery): Promise<{
  data: LabRequestListDto[]
  pagination: Pagination
}> {
  const result = await listLabRequestRows(query)
  return {
    data: result.requests.map(toLabRequestListDto),
    pagination: paginationFor(query.page, query.pageSize, result.totalItems),
  }
}

export async function getLabRequest(id: string): Promise<LabRequestDetailDto> {
  const request = await findLabRequestById(id)
  if (!request) throw new NotFoundError('Laboratory request was not found.')
  return toLabRequestDetailDto(request)
}

export async function registerLabRequest(
  input: CreateLabRequestBody,
  context: MutationContext,
): Promise<LabRequestDetailDto> {
  const request = await database.client.$transaction(async (transaction) => {
    const requestedByDoctorId = await requireActiveRequestingDoctor(
      context.actorUserId,
      transaction,
    )
    const patient = await findPatientById(input.patientId, transaction)
    if (!patient) throw new NotFoundError('Patient was not found.')

    if (input.medicalRecordId) {
      const medicalRecord = await findMedicalRecordById(
        input.medicalRecordId,
        transaction,
      )
      if (!medicalRecord) throw new NotFoundError('Medical record was not found.')
      if (medicalRecord.patientId !== input.patientId) {
        throw new ConflictError(
          'The medical record does not belong to the selected patient.',
        )
      }
    }

    for (const item of input.items) {
      const test = await findLabTestDefinitionById(
        item.testDefinitionId,
        transaction,
      )
      if (!test) throw new NotFoundError('Laboratory test was not found.')
      if (test.status !== 'active') {
        throw new ConflictError(
          'Inactive laboratory tests cannot be selected for a new request.',
        )
      }
    }

    const created = await createLabRequestRecord(
      input,
      requestedByDoctorId,
      transaction,
    )
    await writeAudit(
      {
        actorUserId: context.actorUserId,
        action: 'lab_request.create',
        resourceType: 'lab_request',
        resourceId: created.id,
        outcome: 'success',
        requestId: context.requestId,
        metadata: {
          fields: [
            'patientId',
            'items',
            ...(input.medicalRecordId ? ['medicalRecordId'] : []),
            ...(input.clinicalNote !== undefined ? ['clinicalNote'] : []),
          ],
          itemCount: input.items.length,
          patientId: input.patientId,
          ...(input.medicalRecordId
            ? { medicalRecordId: input.medicalRecordId }
            : {}),
        },
      },
      transaction,
    )
    return created
  })
  return toLabRequestDetailDto(request)
}

export async function collectLabSample(
  requestId: string,
  itemId: string,
  context: MutationContext,
): Promise<LabRequestDetailDto> {
  const request = await database.client.$transaction(async (transaction) => {
    const collectorEmployeeId = await requireActiveEmployee(
      context.actorUserId,
      transaction,
    )
    const lockedRequest = await lockLabRequest(requestId, transaction)
    if (!lockedRequest) throw new NotFoundError('Laboratory request was not found.')
    const items = await lockLabRequestItems(requestId, transaction)
    const target = items.find((item) => item.id === itemId)
    if (!target) {
      throw new NotFoundError('Laboratory request item was not found.')
    }
    if (target.status !== 'requested') {
      throw new ConflictError(
        'Sample collection is allowed only from the requested status.',
      )
    }

    const collectedAt = new Date()
    const nextStatuses = items.map((item) =>
      item.id === itemId ? 'sample_collected' : item.status,
    )
    const parentStatus = aggregateLabRequestStatus(nextStatuses)
    const updated = await collectLabRequestItem(
      itemId,
      requestId,
      parentStatus,
      collectorEmployeeId,
      collectedAt,
      transaction,
    )
    await writeAudit(
      {
        actorUserId: context.actorUserId,
        action: 'lab_request.sample_collect',
        resourceType: 'lab_request_item',
        resourceId: itemId,
        outcome: 'success',
        requestId: context.requestId,
        metadata: {
          labRequestId: requestId,
          itemId,
          fromStatus: target.status,
          toStatus: 'sample_collected',
          requestStatus: parentStatus,
        },
      },
      transaction,
    )
    return updated
  })
  return toLabRequestDetailDto(request)
}

export async function enterLabResult(
  requestId: string,
  itemId: string,
  input: EnterLabResultBody,
  context: MutationContext,
): Promise<LabRequestDetailDto> {
  const request = await database.client.$transaction(async (transaction) => {
    const enteredByEmployeeId = await requireActiveEmployee(
      context.actorUserId,
      transaction,
    )
    const lockedRequest = await lockLabRequest(requestId, transaction)
    if (!lockedRequest) throw new NotFoundError('Laboratory request was not found.')
    const items = await lockLabRequestItems(requestId, transaction)
    const target = items.find((item) => item.id === itemId)
    if (!target) {
      throw new NotFoundError('Laboratory request item was not found.')
    }
    if (target.status !== 'sample_collected') {
      throw new ConflictError(
        'Result entry is allowed only after sample collection.',
      )
    }

    const existingResults = await countLabResults(itemId, transaction)
    if (existingResults > 0) {
      throw new ConflictError(
        'A result has already been entered for this laboratory test.',
      )
    }

    const enteredAt = new Date()
    const nextStatuses = items.map((item) =>
      item.id === itemId ? 'completed' : item.status,
    )
    const parentStatus = aggregateLabRequestStatus(nextStatuses)
    const updated = await enterLabResultRecord(
      itemId,
      requestId,
      parentStatus,
      input,
      enteredByEmployeeId,
      enteredAt,
      transaction,
    )
    await writeAudit(
      {
        actorUserId: context.actorUserId,
        action: 'lab_result.enter',
        resourceType: 'lab_result',
        resourceId: updated.items.find((item) => item.id === itemId)?.results[0]?.id
          ?? itemId,
        outcome: 'success',
        requestId: context.requestId,
        metadata: {
          labRequestId: requestId,
          itemId,
          versionNumber: 1,
          fromStatus: target.status,
          toStatus: 'completed',
          requestStatus: parentStatus,
        },
      },
      transaction,
    )
    return updated
  })
  return toLabRequestDetailDto(request)
}

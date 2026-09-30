import { createHash, randomUUID } from 'node:crypto'
import { env } from '../../config/env.js'
import { logger } from '../../config/logger.js'
import { database } from '../../database/database.service.js'
import {
  ConflictError,
  NotFoundError,
  ServiceUnavailableError,
  ValidationError,
} from '../../errors/httpErrors.js'
import { documentStorage } from '../../storage/documentStorage.js'
import { writeAudit } from '../audit/audit.service.js'
import {
  detectDocumentMediaType,
  MAX_DOCUMENT_BYTES,
} from './document.constants.js'
import {
  createDocument as createDocumentRecord,
  findDocumentById,
  findPatientForDocuments,
  listDocuments as listDocumentRecords,
  softDeleteDocument,
  updateDocumentMetadata,
} from './document.repository.js'
import type {
  CreateDocumentMeta,
  ListDocumentsQuery,
  UpdateDocumentBody,
} from './document.schemas.js'
import {
  toDocumentDto,
  type DocumentAccessDto,
  type DocumentDto,
} from './document.types.js'

type MutationContext = {
  actorUserId: string
  requestId: string
}

function sanitizeOriginalName(name: string): string {
  const trimmed = name.replace(/[/\\]/g, '_').trim()
  return trimmed.slice(0, 255) || 'document'
}

export async function getDocuments(
  patientId: string,
  query: ListDocumentsQuery,
): Promise<{
  data: DocumentDto[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}> {
  const patient = await findPatientForDocuments(patientId)
  if (!patient) throw new NotFoundError('Patient was not found.')
  const result = await listDocumentRecords(patientId, query)
  return {
    data: result.documents.map(toDocumentDto),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      totalItems: result.totalItems,
      totalPages: Math.ceil(result.totalItems / query.pageSize),
    },
  }
}

export async function getDocument(
  patientId: string,
  documentId: string,
): Promise<DocumentDto> {
  const document = await findDocumentById(documentId)
  if (!document || document.patientId !== patientId || document.status === 'deleted') {
    throw new NotFoundError('Patient document was not found.')
  }
  return toDocumentDto(document)
}

export async function uploadDocument(
  patientId: string,
  meta: CreateDocumentMeta,
  file: { originalName: string; bytes: Buffer } | undefined,
  context: MutationContext,
): Promise<DocumentDto> {
  if (!file) {
    throw new ValidationError('A document file is required.', [
      { path: 'file', message: 'A document file is required.' },
    ])
  }
  if (file.bytes.length === 0 || file.bytes.length > MAX_DOCUMENT_BYTES) {
    throw new ValidationError('File size must be greater than 0 and at most 10 MB.', [
      { path: 'file', message: 'File size must be greater than 0 and at most 10 MB.' },
    ])
  }
  const mediaType = detectDocumentMediaType(file.bytes)
  if (!mediaType) {
    throw new ValidationError('Only PDF, JPEG, and PNG documents are allowed.', [
      { path: 'file', message: 'Only PDF, JPEG, and PNG documents are allowed.' },
    ])
  }

  const patient = await findPatientForDocuments(patientId)
  if (!patient) throw new NotFoundError('Patient was not found.')

  const objectKey = `patient-documents/${randomUUID()}`
  const checksum = createHash('sha256').update(file.bytes).digest('hex')
  try {
    await documentStorage.put(objectKey, file.bytes, mediaType)
  } catch {
    throw new ServiceUnavailableError(
      'Private document storage is unavailable.',
    )
  }

  try {
    const document = await database.client.$transaction(async (transaction) => {
      const created = await createDocumentRecord(
        {
          patientId,
          uploadedByUserId: context.actorUserId,
          objectKey,
          originalName: sanitizeOriginalName(file.originalName),
          detectedMediaType: mediaType,
          sizeBytes: BigInt(file.bytes.length),
          checksum,
          title: meta.title,
          category: meta.category,
          description: meta.description ?? null,
          status: 'available',
          uploadedAt: new Date(),
        },
        transaction,
      )
      await writeAudit(
        {
          actorUserId: context.actorUserId,
          action: 'patient_document.create',
          resourceType: 'patient_document',
          resourceId: created.id,
          outcome: 'success',
          requestId: context.requestId,
          metadata: { fields: ['title', 'category', 'description', 'file'] },
        },
        transaction,
      )
      return created
    })
    return toDocumentDto(document)
  } catch (error) {
    logger.warn(
      { requestId: context.requestId },
      'Document metadata persist failed after storage upload',
    )
    throw error
  }
}

export async function changeDocumentMetadata(
  patientId: string,
  documentId: string,
  input: UpdateDocumentBody,
  context: MutationContext,
): Promise<DocumentDto> {
  const document = await database.client.$transaction(async (transaction) => {
    const existing = await findDocumentById(documentId, transaction)
    if (!existing || existing.patientId !== patientId || existing.status === 'deleted') {
      throw new NotFoundError('Patient document was not found.')
    }
    const updated = await updateDocumentMetadata(documentId, input, transaction)
    await writeAudit(
      {
        actorUserId: context.actorUserId,
        action: 'patient_document.update',
        resourceType: 'patient_document',
        resourceId: documentId,
        outcome: 'success',
        requestId: context.requestId,
        metadata: { fields: Object.keys(input).sort() },
      },
      transaction,
    )
    return updated
  })
  return toDocumentDto(document)
}

export async function removeDocument(
  patientId: string,
  documentId: string,
  context: MutationContext,
): Promise<DocumentDto> {
  const document = await database.client.$transaction(async (transaction) => {
    const existing = await findDocumentById(documentId, transaction)
    if (!existing || existing.patientId !== patientId || existing.status === 'deleted') {
      throw new NotFoundError('Patient document was not found.')
    }
    if (existing.status !== 'available') {
      throw new ConflictError('This document cannot be deleted.')
    }
    const updated = await softDeleteDocument(documentId, new Date(), transaction)
    await writeAudit(
      {
        actorUserId: context.actorUserId,
        action: 'patient_document.delete',
        resourceType: 'patient_document',
        resourceId: documentId,
        outcome: 'success',
        requestId: context.requestId,
        metadata: { fields: ['status'] },
      },
      transaction,
    )
    return updated
  })
  return toDocumentDto(document)
}

export async function issueDocumentAccess(
  patientId: string,
  documentId: string,
  context: MutationContext,
): Promise<DocumentAccessDto> {
  const existing = await findDocumentById(documentId)
  if (!existing || existing.patientId !== patientId || existing.status !== 'available') {
    throw new NotFoundError('Patient document was not found.')
  }
  try {
    const signed = await documentStorage.createSignedDownload(
      existing.objectKey,
      env.storage.signedUrlTtlSeconds,
    )
    await writeAudit({
      actorUserId: context.actorUserId,
      action: 'patient_document.access',
      resourceType: 'patient_document',
      resourceId: documentId,
      outcome: 'success',
      requestId: context.requestId,
      metadata: { fields: ['access'] },
    })
    return {
      url: signed.url,
      expiresAt: signed.expiresAt.toISOString(),
    }
  } catch (error) {
    if (error instanceof ServiceUnavailableError) throw error
    throw new ServiceUnavailableError(
      'Private document storage is unavailable.',
    )
  }
}

import { Prisma } from '@prisma/client'
import { database } from '../../database/database.service.js'
import type { ListDocumentsQuery } from './document.schemas.js'

type DocumentClient = Pick<
  Prisma.TransactionClient,
  'patientDocument' | 'patient'
>

function clientOrDefault(client?: DocumentClient): DocumentClient {
  return client ?? database.client
}

export async function listDocuments(
  patientId: string,
  query: ListDocumentsQuery,
): Promise<{ documents: Prisma.PatientDocumentGetPayload<object>[]; totalItems: number }> {
  const where: Prisma.PatientDocumentWhereInput = {
    patientId,
    status: { not: 'deleted' },
    ...(query.category ? { category: query.category } : {}),
  }
  const totalItems = await database.client.patientDocument.count({ where })
  const offset = (query.page - 1) * query.pageSize
  const documents =
    offset >= totalItems
      ? []
      : await database.client.patientDocument.findMany({
          where,
          skip: offset,
          take: query.pageSize,
          orderBy: [{ [query.sortBy]: query.sortOrder }, { id: 'asc' }],
        })
  return { documents, totalItems }
}

export function findDocumentById(
  id: string,
  client?: DocumentClient,
) {
  return clientOrDefault(client).patientDocument.findUnique({ where: { id } })
}

export function findPatientForDocuments(
  id: string,
  client?: DocumentClient,
) {
  return clientOrDefault(client).patient.findUnique({
    where: { id },
    select: { id: true },
  })
}

export function createDocument(
  input: {
    patientId: string
    uploadedByUserId: string
    objectKey: string
    originalName: string
    detectedMediaType: string
    sizeBytes: bigint
    checksum: string
    title: string
    category: string
    description: string | null
    status: string
    uploadedAt: Date | null
  },
  client?: DocumentClient,
) {
  return clientOrDefault(client).patientDocument.create({ data: input })
}

export function updateDocumentMetadata(
  id: string,
  input: {
    title?: string | undefined
    category?: string | undefined
    description?: string | null | undefined
  },
  client?: DocumentClient,
) {
  const data: Prisma.PatientDocumentUpdateInput = { updatedAt: new Date() }
  if (input.title !== undefined) data.title = input.title
  if (input.category !== undefined) data.category = input.category
  if (input.description !== undefined) data.description = input.description
  return clientOrDefault(client).patientDocument.update({ where: { id }, data })
}

export function softDeleteDocument(
  id: string,
  deletedAt: Date,
  client?: DocumentClient,
) {
  return clientOrDefault(client).patientDocument.update({
    where: { id },
    data: {
      status: 'deleted',
      deletedAt,
      updatedAt: deletedAt,
    },
  })
}

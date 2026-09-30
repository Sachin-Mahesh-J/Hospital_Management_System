import type { PatientDocument } from '@prisma/client'

export type DocumentDto = {
  id: string
  patientId: string
  uploadedByUserId: string
  originalName: string
  detectedMediaType: string
  sizeBytes: string
  title: string
  category: string
  status: string
  description: string | null
  uploadedAt: string | null
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

export type DocumentAccessDto = {
  url: string
  expiresAt: string
}

export function toDocumentDto(document: PatientDocument): DocumentDto {
  return {
    id: document.id,
    patientId: document.patientId,
    uploadedByUserId: document.uploadedByUserId,
    originalName: document.originalName,
    detectedMediaType: document.detectedMediaType,
    sizeBytes: document.sizeBytes.toString(),
    title: document.title,
    category: document.category,
    status: document.status,
    description: document.description,
    uploadedAt: document.uploadedAt?.toISOString() ?? null,
    deletedAt: document.deletedAt?.toISOString() ?? null,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  }
}

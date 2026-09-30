import { z } from 'zod'
import { DOCUMENT_CATEGORIES } from './document.constants.js'

export const DOCUMENT_SORT_FIELDS = ['createdAt', 'title', 'category'] as const

export const createDocumentMetaSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    category: z.enum(DOCUMENT_CATEGORIES),
    description: z.string().trim().min(1).max(500).nullable().optional(),
  })
  .strict()

export const updateDocumentBodySchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    category: z.enum(DOCUMENT_CATEGORIES).optional(),
    description: z.string().trim().min(1).max(500).nullable().optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0, {
    message: 'At least one document metadata field must be supplied.',
  })

export const patientDocumentParamsSchema = z
  .object({
    patientId: z.string().uuid(),
    documentId: z.string().uuid().optional(),
  })
  .strict()

export const listDocumentsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    category: z.enum(DOCUMENT_CATEGORIES).optional(),
    sortBy: z.enum(DOCUMENT_SORT_FIELDS).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict()

export type CreateDocumentMeta = z.infer<typeof createDocumentMetaSchema>
export type UpdateDocumentBody = z.infer<typeof updateDocumentBodySchema>
export type ListDocumentsQuery = z.infer<typeof listDocumentsQuerySchema>

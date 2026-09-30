import type { RequestHandler } from 'express'
import { sendPaginated, sendSuccess } from '../../api/response.js'
import {
  createDocumentMetaSchema,
  listDocumentsQuerySchema,
  patientDocumentParamsSchema,
  updateDocumentBodySchema,
} from './document.schemas.js'
import {
  changeDocumentMetadata,
  getDocument,
  getDocuments,
  issueDocumentAccess,
  removeDocument,
  uploadDocument,
} from './document.service.js'

function parsePatientDocumentParams(params: unknown) {
  const parsed = patientDocumentParamsSchema.parse(params)
  if (!parsed.documentId) {
    return { patientId: parsed.patientId, documentId: undefined as undefined }
  }
  return { patientId: parsed.patientId, documentId: parsed.documentId }
}

export const listDocumentsController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { patientId } = parsePatientDocumentParams(request.params)
    const result = await getDocuments(
      patientId,
      listDocumentsQuerySchema.parse(request.query),
    )
    sendPaginated(response, result.data, result.pagination)
  } catch (error) {
    next(error)
  }
}

export const getDocumentController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { patientId, documentId } = parsePatientDocumentParams(request.params)
    sendSuccess(response, await getDocument(patientId, documentId!))
  } catch (error) {
    next(error)
  }
}

export const uploadDocumentController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { patientId } = parsePatientDocumentParams(request.params)
    const file = request.file
    const document = await uploadDocument(
      patientId,
      createDocumentMetaSchema.parse({
        title: request.body?.title,
        category: request.body?.category,
        description: request.body?.description || undefined,
      }),
      file
        ? { originalName: file.originalname, bytes: file.buffer }
        : undefined,
      {
        actorUserId: response.locals.currentUser!.id,
        requestId: response.locals.requestId,
      },
    )
    sendSuccess(response, document, 201)
  } catch (error) {
    next(error)
  }
}

export const updateDocumentController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { patientId, documentId } = parsePatientDocumentParams(request.params)
    const document = await changeDocumentMetadata(
      patientId,
      documentId!,
      updateDocumentBodySchema.parse(request.body),
      {
        actorUserId: response.locals.currentUser!.id,
        requestId: response.locals.requestId,
      },
    )
    sendSuccess(response, document)
  } catch (error) {
    next(error)
  }
}

export const deleteDocumentController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { patientId, documentId } = parsePatientDocumentParams(request.params)
    const document = await removeDocument(patientId, documentId!, {
      actorUserId: response.locals.currentUser!.id,
      requestId: response.locals.requestId,
    })
    sendSuccess(response, document)
  } catch (error) {
    next(error)
  }
}

export const accessDocumentController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { patientId, documentId } = parsePatientDocumentParams(request.params)
    sendSuccess(
      response,
      await issueDocumentAccess(patientId, documentId!, {
        actorUserId: response.locals.currentUser!.id,
        requestId: response.locals.requestId,
      }),
    )
  } catch (error) {
    next(error)
  }
}

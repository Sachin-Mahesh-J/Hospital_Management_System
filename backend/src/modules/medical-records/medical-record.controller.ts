import type { RequestHandler } from 'express'
import { sendPaginated, sendSuccess } from '../../api/response.js'
import {
  amendMedicalRecordBodySchema,
  createMedicalRecordBodySchema,
  listMedicalRecordsQuerySchema,
  medicalRecordIdParamsSchema,
  updateMedicalRecordBodySchema,
} from './medical-record.schemas.js'
import {
  amendMedicalRecord,
  changeDraftMedicalRecord,
  finalizeMedicalRecord,
  getMedicalRecord,
  getMedicalRecords,
  registerMedicalRecord,
} from './medical-record.service.js'

function mutationContext(response: Parameters<RequestHandler>[1]) {
  return {
    actorUserId: response.locals.currentUser!.id,
    requestId: response.locals.requestId,
  }
}

export const listMedicalRecordsController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const result = await getMedicalRecords(
      listMedicalRecordsQuerySchema.parse(request.query),
    )
    sendPaginated(response, result.data, result.pagination)
  } catch (error) {
    next(error)
  }
}

export const getMedicalRecordController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { id } = medicalRecordIdParamsSchema.parse(request.params)
    sendSuccess(response, await getMedicalRecord(id))
  } catch (error) {
    next(error)
  }
}

export const createMedicalRecordController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const record = await registerMedicalRecord(
      createMedicalRecordBodySchema.parse(request.body),
      mutationContext(response),
    )
    sendSuccess(response, record, 201)
  } catch (error) {
    next(error)
  }
}

export const updateMedicalRecordController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { id } = medicalRecordIdParamsSchema.parse(request.params)
    const record = await changeDraftMedicalRecord(
      id,
      updateMedicalRecordBodySchema.parse(request.body),
      mutationContext(response),
    )
    sendSuccess(response, record)
  } catch (error) {
    next(error)
  }
}

export const finalizeMedicalRecordController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { id } = medicalRecordIdParamsSchema.parse(request.params)
    sendSuccess(
      response,
      await finalizeMedicalRecord(id, mutationContext(response)),
    )
  } catch (error) {
    next(error)
  }
}

export const amendMedicalRecordController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { id } = medicalRecordIdParamsSchema.parse(request.params)
    const record = await amendMedicalRecord(
      id,
      amendMedicalRecordBodySchema.parse(request.body),
      mutationContext(response),
    )
    sendSuccess(response, record, 201)
  } catch (error) {
    next(error)
  }
}

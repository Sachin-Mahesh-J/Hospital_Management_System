import type { RequestHandler } from 'express'
import { sendPaginated, sendSuccess } from '../../api/response.js'
import {
  cancelPrescriptionBodySchema,
  createPrescriptionBodySchema,
  listPrescriptionsQuerySchema,
  prescriptionIdParamsSchema,
} from './prescription.schemas.js'
import {
  cancelPrescription,
  getPrescription,
  getPrescriptions,
  registerPrescription,
} from './prescription.service.js'

function mutationContext(response: Parameters<RequestHandler>[1]) {
  return {
    actorUserId: response.locals.currentUser!.id,
    requestId: response.locals.requestId,
  }
}

export const listPrescriptionsController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const result = await getPrescriptions(
      listPrescriptionsQuerySchema.parse(request.query),
    )
    sendPaginated(response, result.data, result.pagination)
  } catch (error) {
    next(error)
  }
}

export const getPrescriptionController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { id } = prescriptionIdParamsSchema.parse(request.params)
    sendSuccess(response, await getPrescription(id))
  } catch (error) {
    next(error)
  }
}

export const createPrescriptionController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const prescription = await registerPrescription(
      createPrescriptionBodySchema.parse(request.body),
      mutationContext(response),
    )
    sendSuccess(response, prescription, 201)
  } catch (error) {
    next(error)
  }
}

export const cancelPrescriptionController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { id } = prescriptionIdParamsSchema.parse(request.params)
    const prescription = await cancelPrescription(
      id,
      cancelPrescriptionBodySchema.parse(request.body),
      mutationContext(response),
    )
    sendSuccess(response, prescription)
  } catch (error) {
    next(error)
  }
}

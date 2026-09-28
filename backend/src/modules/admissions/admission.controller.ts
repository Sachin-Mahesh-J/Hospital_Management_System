import type { RequestHandler } from 'express'
import { sendPaginated, sendSuccess } from '../../api/response.js'
import {
  admissionIdParamsSchema,
  cancelAdmissionBodySchema,
  createAdmissionBodySchema,
  dischargeAdmissionBodySchema,
  listAdmissionsQuerySchema,
  updateAdmissionBodySchema,
} from './admission.schemas.js'
import {
  cancelAdmission,
  changeAdmission,
  dischargeAdmission,
  getAdmission,
  getAdmissions,
  registerAdmission,
} from './admission.service.js'

function mutationContext(response: Parameters<RequestHandler>[1]) {
  return {
    actorUserId: response.locals.currentUser!.id,
    requestId: response.locals.requestId,
  }
}

export const listAdmissionsController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const result = await getAdmissions(
      listAdmissionsQuerySchema.parse(request.query),
    )
    sendPaginated(response, result.data, result.pagination)
  } catch (error) {
    next(error)
  }
}

export const getAdmissionController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { id } = admissionIdParamsSchema.parse(request.params)
    sendSuccess(response, await getAdmission(id))
  } catch (error) {
    next(error)
  }
}

export const createAdmissionController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const admission = await registerAdmission(
      createAdmissionBodySchema.parse(request.body),
      mutationContext(response),
    )
    sendSuccess(response, admission, 201)
  } catch (error) {
    next(error)
  }
}

export const updateAdmissionController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { id } = admissionIdParamsSchema.parse(request.params)
    const admission = await changeAdmission(
      id,
      updateAdmissionBodySchema.parse(request.body),
      mutationContext(response),
    )
    sendSuccess(response, admission)
  } catch (error) {
    next(error)
  }
}

export const dischargeAdmissionController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { id } = admissionIdParamsSchema.parse(request.params)
    const admission = await dischargeAdmission(
      id,
      dischargeAdmissionBodySchema.parse(request.body),
      mutationContext(response),
    )
    sendSuccess(response, admission)
  } catch (error) {
    next(error)
  }
}

export const cancelAdmissionController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { id } = admissionIdParamsSchema.parse(request.params)
    const admission = await cancelAdmission(
      id,
      cancelAdmissionBodySchema.parse(request.body),
      mutationContext(response),
    )
    sendSuccess(response, admission)
  } catch (error) {
    next(error)
  }
}

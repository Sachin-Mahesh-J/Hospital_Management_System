import type { RequestHandler } from 'express'
import { sendPaginated, sendSuccess } from '../../api/response.js'
import {
  createLabRequestBodySchema,
  enterLabResultBodySchema,
  labRequestIdParamsSchema,
  labRequestItemParamsSchema,
  listLabRequestsQuerySchema,
  listLabTestsQuerySchema,
} from './laboratory.schemas.js'
import {
  collectLabSample,
  enterLabResult,
  getActiveLabTests,
  getLabRequest,
  getLabRequests,
  registerLabRequest,
} from './laboratory.service.js'

function mutationContext(response: Parameters<RequestHandler>[1]) {
  return {
    actorUserId: response.locals.currentUser!.id,
    requestId: response.locals.requestId,
  }
}

export const listLabTestsController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const result = await getActiveLabTests(
      listLabTestsQuerySchema.parse(request.query),
    )
    sendPaginated(response, result.data, result.pagination)
  } catch (error) {
    next(error)
  }
}

export const listLabRequestsController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const result = await getLabRequests(
      listLabRequestsQuerySchema.parse(request.query),
    )
    sendPaginated(response, result.data, result.pagination)
  } catch (error) {
    next(error)
  }
}

export const getLabRequestController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { id } = labRequestIdParamsSchema.parse(request.params)
    sendSuccess(response, await getLabRequest(id))
  } catch (error) {
    next(error)
  }
}

export const createLabRequestController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const labRequest = await registerLabRequest(
      createLabRequestBodySchema.parse(request.body),
      mutationContext(response),
    )
    sendSuccess(response, labRequest, 201)
  } catch (error) {
    next(error)
  }
}

export const collectLabSampleController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { id, itemId } = labRequestItemParamsSchema.parse(request.params)
    const labRequest = await collectLabSample(
      id,
      itemId,
      mutationContext(response),
    )
    sendSuccess(response, labRequest)
  } catch (error) {
    next(error)
  }
}

export const enterLabResultController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { id, itemId } = labRequestItemParamsSchema.parse(request.params)
    const labRequest = await enterLabResult(
      id,
      itemId,
      enterLabResultBodySchema.parse(request.body),
      mutationContext(response),
    )
    sendSuccess(response, labRequest)
  } catch (error) {
    next(error)
  }
}

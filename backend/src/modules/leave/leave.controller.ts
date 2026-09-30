import type { RequestHandler } from 'express'
import { sendPaginated, sendSuccess } from '../../api/response.js'
import {
  createLeaveBodySchema,
  decideLeaveBodySchema,
  leaveIdParamsSchema,
  listLeaveQuerySchema,
  updateLeaveBodySchema,
} from './leave.schemas.js'
import {
  approveLeave,
  cancelLeave,
  changeLeave,
  getLeaveRecord,
  getLeaveRecords,
  registerLeave,
  rejectLeave,
} from './leave.service.js'

export const listLeaveController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const result = await getLeaveRecords(
      listLeaveQuerySchema.parse(request.query),
      response.locals.currentUser!,
    )
    sendPaginated(response, result.data, result.pagination)
  } catch (error) {
    next(error)
  }
}

export const getLeaveController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { id } = leaveIdParamsSchema.parse(request.params)
    sendSuccess(
      response,
      await getLeaveRecord(id, response.locals.currentUser!),
    )
  } catch (error) {
    next(error)
  }
}

export const createLeaveController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const record = await registerLeave(
      createLeaveBodySchema.parse(request.body),
      {
        actor: response.locals.currentUser!,
        requestId: response.locals.requestId,
      },
    )
    sendSuccess(response, record, 201)
  } catch (error) {
    next(error)
  }
}

export const updateLeaveController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { id } = leaveIdParamsSchema.parse(request.params)
    const record = await changeLeave(
      id,
      updateLeaveBodySchema.parse(request.body),
      {
        actor: response.locals.currentUser!,
        requestId: response.locals.requestId,
      },
    )
    sendSuccess(response, record)
  } catch (error) {
    next(error)
  }
}

export const approveLeaveController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { id } = leaveIdParamsSchema.parse(request.params)
    const record = await approveLeave(
      id,
      decideLeaveBodySchema.parse(request.body ?? {}),
      {
        actor: response.locals.currentUser!,
        requestId: response.locals.requestId,
      },
    )
    sendSuccess(response, record)
  } catch (error) {
    next(error)
  }
}

export const rejectLeaveController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { id } = leaveIdParamsSchema.parse(request.params)
    const record = await rejectLeave(
      id,
      decideLeaveBodySchema.parse(request.body ?? {}),
      {
        actor: response.locals.currentUser!,
        requestId: response.locals.requestId,
      },
    )
    sendSuccess(response, record)
  } catch (error) {
    next(error)
  }
}

export const cancelLeaveController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { id } = leaveIdParamsSchema.parse(request.params)
    const record = await cancelLeave(id, {
      actor: response.locals.currentUser!,
      requestId: response.locals.requestId,
    })
    sendSuccess(response, record)
  } catch (error) {
    next(error)
  }
}

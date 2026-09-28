import type { RequestHandler } from 'express'
import { sendPaginated, sendSuccess } from '../../api/response.js'
import {
  adjustStockBodySchema,
  listInventoryQuerySchema,
  listMovementsQuerySchema,
  receiveStockBodySchema,
} from './pharmacy.schemas.js'
import {
  adjustStock,
  getInventory,
  getStockMovements,
  receiveStock,
} from './pharmacy.service.js'

function mutationContext(response: Parameters<RequestHandler>[1]) {
  return {
    actorUserId: response.locals.currentUser!.id,
    requestId: response.locals.requestId,
  }
}

export const listInventoryController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const result = await getInventory(
      listInventoryQuerySchema.parse(request.query),
    )
    sendPaginated(response, result.data, result.pagination)
  } catch (error) {
    next(error)
  }
}

export const listMovementsController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const result = await getStockMovements(
      listMovementsQuerySchema.parse(request.query),
    )
    sendPaginated(response, result.data, result.pagination)
  } catch (error) {
    next(error)
  }
}

export const receiveStockController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const result = await receiveStock(
      receiveStockBodySchema.parse(request.body),
      mutationContext(response),
    )
    sendSuccess(response, result, 201)
  } catch (error) {
    next(error)
  }
}

export const adjustStockController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const movement = await adjustStock(
      adjustStockBodySchema.parse(request.body),
      mutationContext(response),
    )
    sendSuccess(response, movement, 201)
  } catch (error) {
    next(error)
  }
}

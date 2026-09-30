import type { RequestHandler } from 'express'
import { sendPaginated, sendSuccess } from '../../api/response.js'
import {
  createMedicineBodySchema,
  listMedicinesQuerySchema,
  medicineIdParamsSchema,
  updateMedicineBodySchema,
} from './medicine.schemas.js'
import {
  changeMedicine,
  deactivateMedicine,
  getMedicine,
  getMedicines,
  reactivateMedicine,
  registerMedicine,
} from './medicine.service.js'

function mutationContext(response: Parameters<RequestHandler>[1]) {
  return {
    actorUserId: response.locals.currentUser!.id,
    requestId: response.locals.requestId,
  }
}

export const listMedicinesController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const result = await getMedicines(
      listMedicinesQuerySchema.parse(request.query),
    )
    sendPaginated(response, result.data, result.pagination)
  } catch (error) {
    next(error)
  }
}

export const getMedicineController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { id } = medicineIdParamsSchema.parse(request.params)
    sendSuccess(response, await getMedicine(id))
  } catch (error) {
    next(error)
  }
}

export const createMedicineController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const medicine = await registerMedicine(
      createMedicineBodySchema.parse(request.body),
      mutationContext(response),
    )
    sendSuccess(response, medicine, 201)
  } catch (error) {
    next(error)
  }
}

export const updateMedicineController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { id } = medicineIdParamsSchema.parse(request.params)
    const medicine = await changeMedicine(
      id,
      updateMedicineBodySchema.parse(request.body),
      mutationContext(response),
    )
    sendSuccess(response, medicine)
  } catch (error) {
    next(error)
  }
}

export const deactivateMedicineController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { id } = medicineIdParamsSchema.parse(request.params)
    sendSuccess(response, await deactivateMedicine(id, mutationContext(response)))
  } catch (error) {
    next(error)
  }
}

export const reactivateMedicineController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { id } = medicineIdParamsSchema.parse(request.params)
    sendSuccess(response, await reactivateMedicine(id, mutationContext(response)))
  } catch (error) {
    next(error)
  }
}

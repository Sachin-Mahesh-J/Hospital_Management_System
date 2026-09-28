import type { RequestHandler } from 'express'
import { sendPaginated } from '../../api/response.js'
import { listMedicinesQuerySchema } from './medicine.schemas.js'
import { getActiveMedicines } from './medicine.service.js'

export const listMedicinesController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const result = await getActiveMedicines(
      listMedicinesQuerySchema.parse(request.query),
    )
    sendPaginated(response, result.data, result.pagination)
  } catch (error) {
    next(error)
  }
}

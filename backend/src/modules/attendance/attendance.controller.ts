import type { RequestHandler } from 'express'
import { sendPaginated, sendSuccess } from '../../api/response.js'
import {
  attendanceIdParamsSchema,
  createAttendanceBodySchema,
  listAttendanceQuerySchema,
  updateAttendanceBodySchema,
} from './attendance.schemas.js'
import {
  changeAttendance,
  getAttendanceRecord,
  getAttendanceRecords,
  registerAttendance,
} from './attendance.service.js'

export const listAttendanceController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const result = await getAttendanceRecords(
      listAttendanceQuerySchema.parse(request.query),
    )
    sendPaginated(response, result.data, result.pagination)
  } catch (error) {
    next(error)
  }
}

export const getAttendanceController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { id } = attendanceIdParamsSchema.parse(request.params)
    sendSuccess(response, await getAttendanceRecord(id))
  } catch (error) {
    next(error)
  }
}

export const createAttendanceController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const record = await registerAttendance(
      createAttendanceBodySchema.parse(request.body),
      {
        actorUserId: response.locals.currentUser!.id,
        requestId: response.locals.requestId,
      },
    )
    sendSuccess(response, record, 201)
  } catch (error) {
    next(error)
  }
}

export const updateAttendanceController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { id } = attendanceIdParamsSchema.parse(request.params)
    const record = await changeAttendance(
      id,
      updateAttendanceBodySchema.parse(request.body),
      {
        actorUserId: response.locals.currentUser!.id,
        requestId: response.locals.requestId,
      },
    )
    sendSuccess(response, record)
  } catch (error) {
    next(error)
  }
}

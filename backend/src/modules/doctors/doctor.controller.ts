import type { RequestHandler } from 'express'
import { sendPaginated, sendSuccess } from '../../api/response.js'
import {
  createDoctorBodySchema,
  doctorIdParamsSchema,
  listDoctorsQuerySchema,
  updateDoctorBodySchema,
} from './doctor.schemas.js'
import {
  changeDoctor,
  getDoctor,
  getDoctors,
  registerDoctor,
} from './doctor.service.js'
import {
  createScheduleBodySchema,
  listSchedulesQuerySchema,
  scheduleDoctorParamsSchema,
  scheduleParamsSchema,
  updateScheduleBodySchema,
} from './schedule.schemas.js'
import {
  changeDoctorSchedule,
  getDoctorSchedules,
  registerDoctorSchedule,
} from './schedule.service.js'

export const listDoctorsController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const result = await getDoctors(listDoctorsQuerySchema.parse(request.query))
    sendPaginated(response, result.data, result.pagination)
  } catch (error) {
    next(error)
  }
}

export const getDoctorController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { id } = doctorIdParamsSchema.parse(request.params)
    sendSuccess(response, await getDoctor(id))
  } catch (error) {
    next(error)
  }
}

export const createDoctorController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const doctor = await registerDoctor(
      createDoctorBodySchema.parse(request.body),
      {
        actorUserId: response.locals.currentUser!.id,
        requestId: response.locals.requestId,
      },
    )
    sendSuccess(response, doctor, 201)
  } catch (error) {
    next(error)
  }
}

export const updateDoctorController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { id } = doctorIdParamsSchema.parse(request.params)
    const doctor = await changeDoctor(
      id,
      updateDoctorBodySchema.parse(request.body),
      {
        actorUserId: response.locals.currentUser!.id,
        requestId: response.locals.requestId,
      },
    )
    sendSuccess(response, doctor)
  } catch (error) {
    next(error)
  }
}

export const listDoctorSchedulesController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { doctorId } = scheduleDoctorParamsSchema.parse(request.params)
    const result = await getDoctorSchedules(
      doctorId,
      listSchedulesQuerySchema.parse(request.query),
    )
    sendPaginated(response, result.data, result.pagination)
  } catch (error) {
    next(error)
  }
}

export const createDoctorScheduleController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { doctorId } = scheduleDoctorParamsSchema.parse(request.params)
    const schedule = await registerDoctorSchedule(
      doctorId,
      createScheduleBodySchema.parse(request.body),
      {
        actorUserId: response.locals.currentUser!.id,
        requestId: response.locals.requestId,
      },
    )
    sendSuccess(response, schedule, 201)
  } catch (error) {
    next(error)
  }
}

export const updateDoctorScheduleController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { doctorId, scheduleId } = scheduleParamsSchema.parse(request.params)
    const schedule = await changeDoctorSchedule(
      doctorId,
      scheduleId,
      updateScheduleBodySchema.parse(request.body),
      {
        actorUserId: response.locals.currentUser!.id,
        requestId: response.locals.requestId,
      },
    )
    sendSuccess(response, schedule)
  } catch (error) {
    next(error)
  }
}

import type { RequestHandler } from 'express'
import { sendPaginated, sendSuccess } from '../../api/response.js'
import {
  appointmentIdParamsSchema,
  cancelAppointmentBodySchema,
  createAppointmentBodySchema,
  listAppointmentsQuerySchema,
  rescheduleAppointmentBodySchema,
  updateAppointmentBodySchema,
  updateAppointmentStatusBodySchema,
} from './appointment.schemas.js'
import {
  cancelAppointment,
  changeAppointment,
  changeAppointmentStatus,
  getAppointment,
  getAppointments,
  registerAppointment,
  rescheduleAppointment,
} from './appointment.service.js'

function mutationContext(response: Parameters<RequestHandler>[1]) {
  return {
    actorUserId: response.locals.currentUser!.id,
    requestId: response.locals.requestId,
  }
}

export const listAppointmentsController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const result = await getAppointments(
      listAppointmentsQuerySchema.parse(request.query),
    )
    sendPaginated(response, result.data, result.pagination)
  } catch (error) {
    next(error)
  }
}

export const getAppointmentController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { id } = appointmentIdParamsSchema.parse(request.params)
    sendSuccess(response, await getAppointment(id))
  } catch (error) {
    next(error)
  }
}

export const createAppointmentController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const appointment = await registerAppointment(
      createAppointmentBodySchema.parse(request.body),
      mutationContext(response),
    )
    sendSuccess(response, appointment, 201)
  } catch (error) {
    next(error)
  }
}

export const updateAppointmentController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { id } = appointmentIdParamsSchema.parse(request.params)
    const appointment = await changeAppointment(
      id,
      updateAppointmentBodySchema.parse(request.body),
      mutationContext(response),
    )
    sendSuccess(response, appointment)
  } catch (error) {
    next(error)
  }
}

export const cancelAppointmentController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { id } = appointmentIdParamsSchema.parse(request.params)
    const appointment = await cancelAppointment(
      id,
      cancelAppointmentBodySchema.parse(request.body),
      mutationContext(response),
    )
    sendSuccess(response, appointment)
  } catch (error) {
    next(error)
  }
}

export const rescheduleAppointmentController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { id } = appointmentIdParamsSchema.parse(request.params)
    const appointment = await rescheduleAppointment(
      id,
      rescheduleAppointmentBodySchema.parse(request.body),
      mutationContext(response),
    )
    sendSuccess(response, appointment)
  } catch (error) {
    next(error)
  }
}

export const updateAppointmentStatusController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { id } = appointmentIdParamsSchema.parse(request.params)
    const appointment = await changeAppointmentStatus(
      id,
      updateAppointmentStatusBodySchema.parse(request.body),
      mutationContext(response),
    )
    sendSuccess(response, appointment)
  } catch (error) {
    next(error)
  }
}

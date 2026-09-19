import type { RequestHandler } from 'express'
import { sendPaginated, sendSuccess } from '../../api/response.js'
import {
  createPatientBodySchema,
  listPatientsQuerySchema,
  patientIdParamsSchema,
  updatePatientBodySchema,
} from './patient.schemas.js'
import {
  changePatient,
  getPatient,
  getPatients,
  registerPatient,
} from './patient.service.js'

export const listPatientsController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const result = await getPatients(listPatientsQuerySchema.parse(request.query))
    sendPaginated(response, result.data, result.pagination)
  } catch (error) {
    next(error)
  }
}

export const getPatientController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { id } = patientIdParamsSchema.parse(request.params)
    sendSuccess(response, await getPatient(id))
  } catch (error) {
    next(error)
  }
}

export const createPatientController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const patient = await registerPatient(
      createPatientBodySchema.parse(request.body),
      {
        actorUserId: response.locals.currentUser!.id,
        requestId: response.locals.requestId,
      },
    )
    sendSuccess(response, patient, 201)
  } catch (error) {
    next(error)
  }
}

export const updatePatientController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { id } = patientIdParamsSchema.parse(request.params)
    const patient = await changePatient(
      id,
      updatePatientBodySchema.parse(request.body),
      {
        actorUserId: response.locals.currentUser!.id,
        requestId: response.locals.requestId,
      },
    )
    sendSuccess(response, patient)
  } catch (error) {
    next(error)
  }
}

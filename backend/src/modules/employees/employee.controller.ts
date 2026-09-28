import type { RequestHandler } from 'express'
import { sendPaginated, sendSuccess } from '../../api/response.js'
import {
  createEmployeeBodySchema,
  employeeIdParamsSchema,
  listEmployeesQuerySchema,
  updateEmployeeBodySchema,
} from './employee.schemas.js'
import {
  changeEmployee,
  getEmployee,
  getEmployees,
  registerEmployee,
} from './employee.service.js'

export const listEmployeesController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const result = await getEmployees(
      listEmployeesQuerySchema.parse(request.query),
    )
    sendPaginated(response, result.data, result.pagination)
  } catch (error) {
    next(error)
  }
}

export const getEmployeeController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { id } = employeeIdParamsSchema.parse(request.params)
    sendSuccess(response, await getEmployee(id))
  } catch (error) {
    next(error)
  }
}

export const createEmployeeController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const employee = await registerEmployee(
      createEmployeeBodySchema.parse(request.body),
      {
        actorUserId: response.locals.currentUser!.id,
        requestId: response.locals.requestId,
      },
    )
    sendSuccess(response, employee, 201)
  } catch (error) {
    next(error)
  }
}

export const updateEmployeeController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { id } = employeeIdParamsSchema.parse(request.params)
    const employee = await changeEmployee(
      id,
      updateEmployeeBodySchema.parse(request.body),
      {
        actorUserId: response.locals.currentUser!.id,
        requestId: response.locals.requestId,
      },
    )
    sendSuccess(response, employee)
  } catch (error) {
    next(error)
  }
}

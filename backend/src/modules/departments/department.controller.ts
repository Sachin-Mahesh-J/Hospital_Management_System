import type { RequestHandler } from 'express'
import { sendPaginated, sendSuccess } from '../../api/response.js'
import {
  createDepartmentBodySchema,
  departmentIdParamsSchema,
  listDepartmentsQuerySchema,
  updateDepartmentBodySchema,
} from './department.schemas.js'
import {
  changeDepartment,
  getDepartment,
  getDepartments,
  registerDepartment,
} from './department.service.js'

export const listDepartmentsController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const result = await getDepartments(
      listDepartmentsQuerySchema.parse(request.query),
    )
    sendPaginated(response, result.data, result.pagination)
  } catch (error) {
    next(error)
  }
}

export const getDepartmentController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { id } = departmentIdParamsSchema.parse(request.params)
    sendSuccess(response, await getDepartment(id))
  } catch (error) {
    next(error)
  }
}

export const createDepartmentController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const department = await registerDepartment(
      createDepartmentBodySchema.parse(request.body),
      {
        actorUserId: response.locals.currentUser!.id,
        requestId: response.locals.requestId,
      },
    )
    sendSuccess(response, department, 201)
  } catch (error) {
    next(error)
  }
}

export const updateDepartmentController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { id } = departmentIdParamsSchema.parse(request.params)
    const department = await changeDepartment(
      id,
      updateDepartmentBodySchema.parse(request.body),
      {
        actorUserId: response.locals.currentUser!.id,
        requestId: response.locals.requestId,
      },
    )
    sendSuccess(response, department)
  } catch (error) {
    next(error)
  }
}

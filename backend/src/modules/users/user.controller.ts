import type { RequestHandler } from 'express'
import { sendPaginated, sendSuccess } from '../../api/response.js'
import {
  changeUserRoleBodySchema,
  createUserBodySchema,
  listUsersQuerySchema,
  resetUserPasswordBodySchema,
  updateUserBodySchema,
  userIdParamsSchema,
} from './user.schemas.js'
import {
  changeUser,
  changeUserRole,
  deactivateUser,
  getUser,
  getUsers,
  reactivateUser,
  registerUser,
  resetUserPassword,
} from './user.service.js'

export const listUsersController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const result = await getUsers(listUsersQuerySchema.parse(request.query))
    sendPaginated(response, result.data, result.pagination)
  } catch (error) {
    next(error)
  }
}

export const getUserController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { id } = userIdParamsSchema.parse(request.params)
    sendSuccess(response, await getUser(id))
  } catch (error) {
    next(error)
  }
}

export const createUserController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const user = await registerUser(
      createUserBodySchema.parse(request.body),
      {
        actorUserId: response.locals.currentUser!.id,
        requestId: response.locals.requestId,
      },
    )
    sendSuccess(response, user, 201)
  } catch (error) {
    next(error)
  }
}

export const updateUserController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { id } = userIdParamsSchema.parse(request.params)
    const user = await changeUser(
      id,
      updateUserBodySchema.parse(request.body),
      {
        actorUserId: response.locals.currentUser!.id,
        requestId: response.locals.requestId,
      },
    )
    sendSuccess(response, user)
  } catch (error) {
    next(error)
  }
}

export const changeUserRoleController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { id } = userIdParamsSchema.parse(request.params)
    const user = await changeUserRole(
      id,
      changeUserRoleBodySchema.parse(request.body),
      {
        actorUserId: response.locals.currentUser!.id,
        requestId: response.locals.requestId,
      },
    )
    sendSuccess(response, user)
  } catch (error) {
    next(error)
  }
}

export const deactivateUserController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { id } = userIdParamsSchema.parse(request.params)
    sendSuccess(
      response,
      await deactivateUser(id, {
        actorUserId: response.locals.currentUser!.id,
        requestId: response.locals.requestId,
      }),
    )
  } catch (error) {
    next(error)
  }
}

export const reactivateUserController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { id } = userIdParamsSchema.parse(request.params)
    sendSuccess(
      response,
      await reactivateUser(id, {
        actorUserId: response.locals.currentUser!.id,
        requestId: response.locals.requestId,
      }),
    )
  } catch (error) {
    next(error)
  }
}

export const resetUserPasswordController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { id } = userIdParamsSchema.parse(request.params)
    await resetUserPassword(
      id,
      resetUserPasswordBodySchema.parse(request.body),
      {
        actorUserId: response.locals.currentUser!.id,
        requestId: response.locals.requestId,
      },
    )
    response.status(204).send()
  } catch (error) {
    next(error)
  }
}

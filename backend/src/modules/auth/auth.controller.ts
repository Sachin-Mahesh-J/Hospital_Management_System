import type { RequestHandler } from 'express'
import { env } from '../../config/env.js'
import { AppError } from '../../errors/AppError.js'
import {
  clearRefreshCookie,
  setRefreshCookie,
} from '../../auth/refreshCookie.js'
import { sendSuccess } from '../../api/response.js'
import {
  changePasswordBodySchema,
  loginBodySchema,
} from './auth.schemas.js'
import {
  changePassword,
  login,
  logout,
  refresh,
} from './auth.service.js'

export const loginController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const result = await login(loginBodySchema.parse(request.body), {
      requestId: response.locals.requestId,
      userAgent: request.header('user-agent'),
    })
    setRefreshCookie(response, result.refreshToken)
    sendSuccess(response, {
      accessToken: result.accessToken,
      user: result.user,
    })
  } catch (error) {
    next(error)
  }
}

export const refreshController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const result = await refresh(request.cookies[env.auth.cookieName], {
      requestId: response.locals.requestId,
      userAgent: request.header('user-agent'),
    })
    setRefreshCookie(response, result.refreshToken)
    sendSuccess(response, { accessToken: result.accessToken })
  } catch (error) {
    if (
      error instanceof AppError &&
      error.code === 'INVALID_REFRESH_SESSION'
    ) {
      clearRefreshCookie(response)
    }
    next(error)
  }
}

export const logoutController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    await logout(
      request.cookies[env.auth.cookieName],
      response.locals.requestId,
    )
    clearRefreshCookie(response)
    response.status(204).send()
  } catch (error) {
    next(error)
  }
}

export const currentUserController: RequestHandler = (
  _request,
  response,
) => {
  sendSuccess(response, response.locals.currentUser)
}

export const changePasswordController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    await changePassword(
      response.locals.currentUser!.id,
      changePasswordBodySchema.parse(request.body),
      response.locals.requestId,
    )
    clearRefreshCookie(response)
    response.status(204).send()
  } catch (error) {
    next(error)
  }
}

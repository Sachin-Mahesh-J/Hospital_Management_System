import type { RequestHandler } from 'express'
import { verifyAccessToken } from '../auth/token.service.js'
import { AuthenticationError } from '../errors/httpErrors.js'
import { loadCurrentUser } from '../modules/auth/auth.service.js'

export const authenticate: RequestHandler = async (request, response, next) => {
  const authorization = request.header('authorization')
  const match = authorization?.match(/^Bearer ([^\s]+)$/)

  if (!match) {
    next(new AuthenticationError())
    return
  }

  try {
    const claims = await verifyAccessToken(match[1]!)
    const user = await loadCurrentUser(claims.sub, claims.pva)
    if (!user) {
      next(new AuthenticationError())
      return
    }

    response.locals.currentUser = user
    next()
  } catch {
    next(new AuthenticationError())
  }
}

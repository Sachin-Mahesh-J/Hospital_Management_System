import cors from 'cors'
import cookieParser from 'cookie-parser'
import express from 'express'
import helmet from 'helmet'
import { pinoHttp } from 'pino-http'
import swaggerUi from 'swagger-ui-express'
import { env } from './config/env.js'
import { logger } from './config/logger.js'
import { openApiDocument } from './docs/openApi.js'
import { AppError } from './errors/AppError.js'
import {
  errorHandler,
  notFoundHandler,
} from './middleware/errorHandler.js'
import { requestContext } from './middleware/requestContext.js'
import { authRouter } from './modules/auth/auth.routes.js'
import { healthRouter } from './modules/health/health.routes.js'

export function createApp() {
  const app = express()

  app.disable('x-powered-by')
  if (env.auth.trustProxy) {
    app.set('trust proxy', 1)
  }
  app.use(requestContext)
  app.use(
    pinoHttp({
      logger,
      customProps: (_request, response) => ({
        requestId: response.locals.requestId,
      }),
    }),
  )
  app.use(
    '/api/docs',
    helmet({ contentSecurityPolicy: false }),
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument),
  )
  app.use(helmet())
  app.use(
    cors({
      credentials: true,
      origin(origin, callback) {
        if (!origin || env.cors.allowedOrigins.includes(origin)) {
          callback(null, true)
          return
        }

        callback(new AppError(403, 'ORIGIN_NOT_ALLOWED', 'Origin is not allowed.'))
      },
    }),
  )
  app.use(express.json({ limit: '1mb' }))
  app.use(cookieParser())

  app.use('/api/v1/health', healthRouter)
  app.use('/api/v1/auth', authRouter)
  app.get('/api/v1/openapi.json', (_request, response) => {
    response.json(openApiDocument)
  })

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}

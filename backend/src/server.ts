import 'dotenv/config'
import { createApp } from './app.js'
import { env } from './config/env.js'
import { logger } from './config/logger.js'

const app = createApp()
const server = app.listen(env.port, () => {
  logger.info({ port: env.port }, 'HMS API listening')
})

function shutdown(signal: string) {
  logger.info({ signal }, 'Shutting down HMS API')
  server.close((error) => {
    if (error) {
      logger.error({ error }, 'HMS API shutdown failed')
      process.exitCode = 1
      return
    }

    process.exitCode = 0
  })
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

import 'dotenv/config'
import { logger } from './config/logger.js'
import { startApplication } from './application.js'

startApplication().catch((error: unknown) => {
  logger.fatal({ error }, 'HMS API failed to start')
  process.exitCode = 1
})

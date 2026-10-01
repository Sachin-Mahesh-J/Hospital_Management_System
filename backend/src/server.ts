import 'dotenv/config'
import { logStartupFailure } from './config/logger.js'
import { startApplication } from './application.js'

startApplication().catch((error: unknown) => {
  logStartupFailure(error)
  process.exitCode = 1
})

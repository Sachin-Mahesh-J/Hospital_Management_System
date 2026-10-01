import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import type { Express } from 'express'
import { createApp } from './app.js'
import { env } from './config/env.js'
import {
  logger,
  writeStartupDiagnostic,
  type StartupPhase,
} from './config/logger.js'
import { database } from './database/database.service.js'

type DatabaseLifecycle = {
  connect(): Promise<void>
  disconnect(): Promise<void>
}

type LifecycleLogger = {
  info(properties: object, message: string): void
  error(properties: object, message: string): void
}

export type ApplicationHandle = {
  app: Express
  server: Server
  shutdown(signal?: string): Promise<void>
}

export type StartApplicationOptions = {
  app?: Express
  port?: number
  database?: DatabaseLifecycle
  logger?: LifecycleLogger
  registerSignalHandlers?: boolean
}

function listen(app: Express, port: number): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, '0.0.0.0')
    server.once('listening', () => resolve(server))
    server.once('error', reject)
  })
}

function withStartupPhase(error: unknown, phase: StartupPhase): unknown {
  if (error instanceof Error) {
    Object.assign(error, { startupPhase: phase })
    return error
  }

  const wrapped = new Error(typeof error === 'string' ? error : 'Startup failed')
  wrapped.name = 'StartupError'
  Object.assign(wrapped, { startupPhase: phase })
  return wrapped
}

function close(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error)
        return
      }
      resolve()
    })
  })
}

export async function startApplication(
  options: StartApplicationOptions = {},
): Promise<ApplicationHandle> {
  let phase: StartupPhase = 'before_database'
  let app: Express
  try {
    app = options.app ?? createApp()
  } catch (error) {
    throw withStartupPhase(error, phase)
  }
  const port = options.port ?? env.port
  const databaseLifecycle = options.database ?? database
  const lifecycleLogger = options.logger ?? logger

  try {
    lifecycleLogger.info({}, 'HMS API startup: connecting to database')
    writeStartupDiagnostic('HMS API startup: connecting to database')
    phase = 'database_connect'
    await databaseLifecycle.connect()
    lifecycleLogger.info({}, 'HMS API startup: database connected')
    writeStartupDiagnostic('HMS API startup: database connected')
    phase = 'after_database'
  } catch (error) {
    try {
      await databaseLifecycle.disconnect()
    } catch (disconnectError) {
      lifecycleLogger.error(
        { error: disconnectError },
        'Database cleanup after startup failure failed',
      )
    }
    throw withStartupPhase(error, phase)
  }

  let server: Server
  try {
    phase = 'listen'
    server = await listen(app, port)
  } catch (error) {
    await databaseLifecycle.disconnect()
    throw withStartupPhase(error, phase)
  }

  const address = server.address() as AddressInfo | null
  lifecycleLogger.info(
    { port: address?.port ?? port },
    'HMS API listening',
  )
  writeStartupDiagnostic('HMS API listening')

  let shutdownPromise: Promise<void> | null = null
  const signalHandlers = new Map<NodeJS.Signals, () => void>()

  const removeSignalHandlers = () => {
    for (const [signal, handler] of signalHandlers) {
      process.off(signal, handler)
    }
    signalHandlers.clear()
  }

  const shutdown = (signal = 'application'): Promise<void> => {
    shutdownPromise ??= (async () => {
      lifecycleLogger.info({ signal }, 'Shutting down HMS API')
      removeSignalHandlers()

      try {
        await close(server)
      } finally {
        await databaseLifecycle.disconnect()
      }
    })().catch((error: unknown) => {
      lifecycleLogger.error({ error, signal }, 'HMS API shutdown failed')
      throw error
    })

    return shutdownPromise
  }

  if (options.registerSignalHandlers !== false) {
    for (const signal of ['SIGINT', 'SIGTERM'] as const) {
      const handler = () => {
        void shutdown(signal).catch(() => {
          process.exitCode = 1
        })
      }
      signalHandlers.set(signal, handler)
      process.on(signal, handler)
    }
  }

  return { app, server, shutdown }
}

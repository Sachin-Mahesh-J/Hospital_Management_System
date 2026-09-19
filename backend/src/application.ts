import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import type { Express } from 'express'
import { createApp } from './app.js'
import { env } from './config/env.js'
import { logger } from './config/logger.js'
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
    const server = app.listen(port)
    server.once('listening', () => resolve(server))
    server.once('error', reject)
  })
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
  const app = options.app ?? createApp()
  const port = options.port ?? env.port
  const databaseLifecycle = options.database ?? database
  const lifecycleLogger = options.logger ?? logger

  try {
    await databaseLifecycle.connect()
  } catch (error) {
    try {
      await databaseLifecycle.disconnect()
    } catch (disconnectError) {
      lifecycleLogger.error(
        { error: disconnectError },
        'Database cleanup after startup failure failed',
      )
    }
    throw error
  }

  let server: Server
  try {
    server = await listen(app, port)
  } catch (error) {
    await databaseLifecycle.disconnect()
    throw error
  }

  const address = server.address() as AddressInfo | null
  lifecycleLogger.info(
    { port: address?.port ?? port },
    'HMS API listening',
  )

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

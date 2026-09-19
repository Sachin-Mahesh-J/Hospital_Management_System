import express from 'express'
import { describe, expect, it, vi } from 'vitest'
import { startApplication } from '../src/application.js'

describe('application lifecycle', () => {
  it('connects before listening and shuts down once', async () => {
    const events: string[] = []
    const database = {
      connect: vi.fn(async () => {
        events.push('connect')
      }),
      disconnect: vi.fn(async () => {
        events.push('disconnect')
      }),
    }
    const lifecycleLogger = {
      info: vi.fn(),
      error: vi.fn(),
    }

    const handle = await startApplication({
      app: express(),
      port: 0,
      database,
      logger: lifecycleLogger,
      registerSignalHandlers: false,
    })
    events.push('listening')

    await Promise.all([handle.shutdown('test'), handle.shutdown('test')])

    expect(events).toEqual(['connect', 'listening', 'disconnect'])
    expect(database.connect).toHaveBeenCalledOnce()
    expect(database.disconnect).toHaveBeenCalledOnce()
    expect(handle.server.listening).toBe(false)
  })

  it('cleans up when database initialization fails', async () => {
    const startupError = new Error('connection failed')
    const database = {
      connect: vi.fn().mockRejectedValue(startupError),
      disconnect: vi.fn().mockResolvedValue(undefined),
    }

    await expect(
      startApplication({
        app: express(),
        port: 0,
        database,
        logger: { info: vi.fn(), error: vi.fn() },
        registerSignalHandlers: false,
      }),
    ).rejects.toBe(startupError)

    expect(database.disconnect).toHaveBeenCalledOnce()
  })
})

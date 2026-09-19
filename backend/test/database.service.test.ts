import { describe, expect, it, vi } from 'vitest'
import { DatabaseService } from '../src/database/database.service.js'

describe('DatabaseService', () => {
  it('creates one client and reuses it until shutdown', async () => {
    const client = {
      $connect: vi.fn().mockResolvedValue(undefined),
      $disconnect: vi.fn().mockResolvedValue(undefined),
    }
    const createClient = vi.fn(() => client)
    const service = new DatabaseService(createClient)

    expect(service.client).toBe(client)
    expect(service.client).toBe(client)
    await service.connect()
    await service.disconnect()

    expect(createClient).toHaveBeenCalledTimes(1)
    expect(client.$connect).toHaveBeenCalledOnce()
    expect(client.$disconnect).toHaveBeenCalledOnce()
  })

  it('does not create a client solely to disconnect it', async () => {
    const createClient = vi.fn(() => ({
      $connect: vi.fn(),
      $disconnect: vi.fn(),
    }))
    const service = new DatabaseService(createClient)

    await service.disconnect()

    expect(createClient).not.toHaveBeenCalled()
  })
})

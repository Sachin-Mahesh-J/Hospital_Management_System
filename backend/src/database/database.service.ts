import { PrismaClient } from '@prisma/client'
import { env } from '../config/env.js'

export type DatabaseClient = Pick<PrismaClient, '$connect' | '$disconnect'>

type DatabaseClientFactory<TClient extends DatabaseClient> = () => TClient

export class DatabaseService<TClient extends DatabaseClient = PrismaClient> {
  private clientInstance: TClient | null = null

  constructor(private readonly createClient: DatabaseClientFactory<TClient>) {}

  get client(): TClient {
    this.clientInstance ??= this.createClient()
    return this.clientInstance
  }

  async connect(): Promise<void> {
    await this.client.$connect()
  }

  async disconnect(): Promise<void> {
    if (!this.clientInstance) {
      return
    }

    try {
      await this.clientInstance.$disconnect()
    } finally {
      this.clientInstance = null
    }
  }
}

export const database = new DatabaseService(
  () =>
    new PrismaClient({
      datasources: { db: { url: env.database.connectionUrl } },
    }),
)

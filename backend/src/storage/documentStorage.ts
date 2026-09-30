import { createClient } from '@supabase/supabase-js'
import { env } from '../config/env.js'
import { logger } from '../config/logger.js'

export type SignedDownload = {
  url: string
  expiresAt: Date
}

export type DocumentStorage = {
  put(objectKey: string, bytes: Buffer, contentType: string): Promise<void>
  createSignedDownload(
    objectKey: string,
    expiresInSeconds: number,
  ): Promise<SignedDownload>
}

const memoryObjects = new Map<string, { bytes: Buffer; contentType: string }>()

function createMemoryStorage(): DocumentStorage {
  return {
    async put(objectKey, bytes, contentType) {
      memoryObjects.set(objectKey, { bytes: Buffer.from(bytes), contentType })
    },
    async createSignedDownload(objectKey, expiresInSeconds) {
      if (!memoryObjects.has(objectKey)) {
        throw new Error('Stored document object was not found.')
      }
      const expiresAt = new Date(Date.now() + expiresInSeconds * 1000)
      return {
        url: `https://storage.test.invalid/signed/${encodeURIComponent(objectKey)}?exp=${expiresAt.getTime()}`,
        expiresAt,
      }
    },
  }
}

function createSupabaseStorage(): DocumentStorage {
  const client = createClient(env.storage.supabaseUrl, env.storage.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const bucket = env.storage.bucket

  return {
    async put(objectKey, bytes, contentType) {
      const { error } = await client.storage.from(bucket).upload(objectKey, bytes, {
        contentType,
        upsert: false,
      })
      if (error) {
        logger.error(
          { requestError: error.name, bucket },
          'Private document storage upload failed',
        )
        throw new Error('Document storage upload failed.')
      }
    },
    async createSignedDownload(objectKey, expiresInSeconds) {
      const { data, error } = await client.storage
        .from(bucket)
        .createSignedUrl(objectKey, expiresInSeconds)
      if (error || !data?.signedUrl) {
        logger.error(
          { requestError: error?.name, bucket },
          'Private document signed URL creation failed',
        )
        throw new Error('Document access could not be issued.')
      }
      return {
        url: data.signedUrl,
        expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
      }
    },
  }
}

export const documentStorage: DocumentStorage =
  env.storage.driver === 'memory'
    ? createMemoryStorage()
    : createSupabaseStorage()

export function resetMemoryDocumentStorage(): void {
  memoryObjects.clear()
}

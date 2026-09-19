import 'dotenv/config'
import { spawnSync } from 'node:child_process'
import { PrismaClient } from '@prisma/client'

const DEVELOPMENT_DATABASE = 'hms_development'
const TEST_DATABASE = 'hms_test'
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])

function parseDevelopmentUrl(): URL {
  const value = process.env.DATABASE_URL
  if (!value) {
    throw new Error('DATABASE_URL must be set in backend/.env.')
  }

  const url = new URL(value)
  const database = url.pathname.replace(/^\//, '')
  const port = url.port || '5432'

  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !LOCAL_HOSTS.has(url.hostname) ||
    port !== '5432' ||
    database !== DEVELOPMENT_DATABASE
  ) {
    throw new Error(
      'Database tests require DATABASE_URL to target local hms_development on port 5432.',
    )
  }

  return url
}

function urlForDatabase(source: URL, database: string): string {
  const url = new URL(source)
  url.pathname = `/${database}`
  return url.toString()
}

function run(command: string, args: string[], databaseUrl: string): void {
  const executable =
    process.platform === 'win32' ? (process.env.ComSpec ?? 'cmd.exe') : command
  const commandArgs =
    process.platform === 'win32'
      ? ['/d', '/s', '/c', [command, ...args].join(' ')]
      : args
  const result = spawnSync(executable, commandArgs, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      HMS_DATABASE_TESTS: 'true',
    },
    stdio: 'inherit',
  })

  if (result.error) {
    throw result.error
  }
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}.`)
  }
}

async function ensureTestDatabase(source: URL): Promise<string> {
  const maintenanceUrl = new URL(urlForDatabase(source, 'postgres'))
  maintenanceUrl.searchParams.delete('schema')

  const admin = new PrismaClient({
    datasources: { db: { url: maintenanceUrl.toString() } },
  })

  try {
    const rows = await admin.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1 FROM pg_database WHERE datname = ${TEST_DATABASE}
      ) AS "exists"
    `

    if (!rows[0]?.exists) {
      await admin.$executeRawUnsafe(`CREATE DATABASE "${TEST_DATABASE}"`)
      console.log(`Created isolated local database ${TEST_DATABASE}.`)
    }
  } finally {
    await admin.$disconnect()
  }

  return urlForDatabase(source, TEST_DATABASE)
}

async function main(): Promise<void> {
  const developmentUrl = parseDevelopmentUrl()
  const testUrl = await ensureTestDatabase(developmentUrl)

  run('npx', ['prisma', 'migrate', 'deploy'], testUrl)
  run('npx', ['vitest', 'run', 'test/database'], testUrl)
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown database test error.'
  console.error(message)
  process.exitCode = 1
})

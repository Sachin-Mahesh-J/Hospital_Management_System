import 'dotenv/config'
import { env } from '../config/env.js'
import { hospitalToday } from '../config/hospitalTime.js'
import { database } from '../database/database.service.js'
import { isDryRunRequested } from './demo-seed/args.js'
import {
  clearApplicationData,
  countApplicationData,
  countPreservedCatalog,
} from './demo-seed/clear.js'
import { populateDemoDataset } from './demo-seed/populate.js'
import {
  demoUsernamesThatWouldBeCreated,
  expectedSeedOperationCounts,
  tablesThatWouldBeCleared,
} from './demo-seed/plan.js'
import {
  LOCAL_OVERRIDE_ENV,
  REMOTE_CONFIRM_ENV,
  REMOTE_CONFIRM_VALUE,
  assertSeedAllowed,
  classifyDatabaseUrl,
  describeTarget,
} from './demo-seed/safety.js'
import { verifyDemoSeed } from './demo-seed/verify.js'

function printCounts(
  title: string,
  counts: Array<{ table: string; count: number }>,
): void {
  const total = counts.reduce((sum, row) => sum + row.count, 0)
  console.info(title)
  for (const row of counts) {
    if (row.count === 0) continue
    console.info(`  ${row.table}: ${row.count}`)
  }
  console.info(`  total: ${total}`)
}

function printRecordCounts(title: string, counts: Record<string, number>): void {
  console.info(title)
  for (const [key, value] of Object.entries(counts).sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    console.info(`  ${key}: ${value}`)
  }
}

async function reportDryRun(): Promise<void> {
  console.info('DRY RUN — NO DATABASE CHANGES MADE')
  const today = hospitalToday()
  const existing = await countApplicationData(database.client)
  const preserved = await countPreservedCatalog(database.client)
  printCounts('Current application row counts:', existing)
  printCounts('Preserved catalog tables (will not be cleared):', preserved)
  console.info('Entities that would be cleared:')
  for (const table of tablesThatWouldBeCleared()) {
    console.info(`  ${table}`)
  }
  console.info('Preserved: roles, permissions, role_permissions, Prisma migration history.')
  console.info('Not dropped: database, schema, or Supabase system tables.')
  printRecordCounts(
    'Expected seed record counts (would be recreated):',
    expectedSeedOperationCounts(today),
  )
  console.info('Entities that would be recreated:')
  console.info(
    '  demo users for every implemented role, departments, employees, doctors, schedules, patients, appointments, admissions, medical records, laboratory catalog/requests, medicines, inventory, prescriptions, billing, attendance, leave, patient documents, and audit examples.',
  )
  console.info('Demo usernames that would be created:')
  for (const username of demoUsernamesThatWouldBeCreated()) {
    console.info(`  ${username}`)
  }
  console.info('DRY RUN — NO DATABASE CHANGES MADE')
}

async function main(): Promise<void> {
  const dryRun = isDryRunRequested(process.argv, process.env)
  const target = classifyDatabaseUrl(env.database.connectionUrl)
  console.info(`HMS demo seed target: ${describeTarget(target)}`)

  if (dryRun) {
    await database.connect()
    await reportDryRun()
    return
  }

  assertSeedAllowed(target, process.env)
  await database.connect()
  console.info(
    'DESTRUCTIVE SEED — this will clear application data and recreate the demo dataset.',
  )
  const existing = await countApplicationData(database.client)
  printCounts('Existing application data that will be replaced:', existing)
  console.info('Preserved: roles, permissions, role_permissions, Prisma migration history.')
  console.info('Not dropped: database, schema, or Supabase system tables.')

  console.info('Clearing application data in foreign-key order...')
  await clearApplicationData(database.client)
  console.info('Seeding fictional demo dataset...')
  const summary = await populateDemoDataset(database.client)
  const remaining = await countApplicationData(database.client)
  printCounts('Application data after seed:', remaining)

  printRecordCounts('Created record counts (seed operations):', summary.counts)

  const verification = await verifyDemoSeed(database.client, hospitalToday())
  if (!verification.ok) {
    console.error('Post-seed verification failed:')
    for (const issue of verification.issues) {
      console.error(`  ${issue}`)
    }
    throw new Error('Demo seed verification failed.')
  }
  console.info('Post-seed verification passed.')

  console.info('\nDEMO LOGIN ACCOUNTS')
  console.info('Login identifier: username')
  for (const account of summary.accounts) {
    console.info('')
    console.info(account.label)
    console.info(`Username: ${account.username}`)
    console.info(`Password: ${account.password}`)
  }
  console.info('\nUse the Administrator account for the initial interviewer demonstration.')
  console.info('Save these credentials securely. They are not written to a file.')
}

try {
  await main()
} catch (error) {
  const message = error instanceof Error ? error.message : 'Demo seed failed.'
  console.error(message)
  if (message.includes('Refusing to seed a local')) {
    console.error(`Example: ${LOCAL_OVERRIDE_ENV}=true npm run db:seed:demo -w backend`)
  }
  if (message.includes('Refusing to seed a remote')) {
    console.error(
      `Example: ${REMOTE_CONFIRM_ENV}=${REMOTE_CONFIRM_VALUE} npm run db:seed:demo -w backend`,
    )
  }
  process.exitCode = 1
} finally {
  await database.disconnect()
}

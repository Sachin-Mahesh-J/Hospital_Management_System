import type { PrismaClient } from '@prisma/client'
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from './accounts.js'
import {
  countApplicationData,
  countPreservedCatalog,
} from './clear.js'
import { expectedApplicationRowCounts } from './plan.js'

export type SeedVerification = {
  ok: boolean
  issues: string[]
}

export async function verifyDemoSeed(
  client: PrismaClient,
  today: string,
): Promise<SeedVerification> {
  const issues: string[] = []
  const users = await client.user.findMany({
    select: { username: true, status: true, passwordHash: true },
    orderBy: { username: 'asc' },
  })

  const expectedUsernames = DEMO_ACCOUNTS.map((account) => account.username).sort()
  const actualUsernames = users.map((user) => user.username).sort()
  if (JSON.stringify(actualUsernames) !== JSON.stringify(expectedUsernames)) {
    issues.push(
      `Unexpected users. expected [${expectedUsernames.join(', ')}] got [${actualUsernames.join(', ')}]`,
    )
  }

  for (const account of DEMO_ACCOUNTS) {
    const user = users.find((row) => row.username === account.username)
    if (!user) continue
    if (user.status !== account.status) {
      issues.push(
        `${account.username} status is ${user.status}, expected ${account.status}.`,
      )
    }
    if (!user.passwordHash.startsWith('$argon2id$')) {
      issues.push(`${account.username} is not stored as an Argon2id hash.`)
    }
    if (user.passwordHash.includes(DEMO_PASSWORD)) {
      issues.push(`${account.username} stored the demo password in plaintext.`)
    }
  }

  for (const row of await countPreservedCatalog(client)) {
    if (row.count === 0) {
      issues.push(`Preserved table ${row.table} is empty after seed.`)
    }
  }

  const expectedRows = expectedApplicationRowCounts(today)
  const actualRows = await countApplicationData(client)
  for (const row of actualRows) {
    const expected = expectedRows[row.table]
    if (expected === undefined) continue
    if (row.count !== expected) {
      issues.push(
        `${row.table} has ${row.count} rows, expected ${expected} after seed.`,
      )
    }
  }

  return { ok: issues.length === 0, issues }
}

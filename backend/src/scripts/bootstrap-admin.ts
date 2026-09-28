import 'dotenv/config'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { hashPassword, validatePasswordPolicy } from '../auth/password.service.js'
import { syncApprovedRolePermissions } from '../auth/roleCatalog.js'
import { database } from '../database/database.service.js'
import { writeAudit } from '../modules/audit/audit.service.js'

const bootstrapSchema = z.object({
  HMS_BOOTSTRAP_ADMIN_USERNAME: z.string().trim().min(1).max(100),
  HMS_BOOTSTRAP_ADMIN_PASSWORD: z
    .string()
    .refine(validatePasswordPolicy, 'does not meet the HMS password policy'),
})

async function bootstrap(): Promise<'created' | 'already_exists'> {
  const input = bootstrapSchema.parse(process.env)
  const passwordHash = await hashPassword(
    input.HMS_BOOTSTRAP_ADMIN_PASSWORD,
  )

  return database.client.$transaction(
    async (transaction) => {
      await transaction.$queryRaw`
        SELECT pg_advisory_xact_lock(
          hashtext('hms_admin_bootstrap')
        )::text AS lock_result
      `

      const roleRows = await syncApprovedRolePermissions(transaction)
      const administratorRoleId = roleRows.get('administrator')!
      const existingAdministrator = await transaction.userRole.findFirst({
        where: { roleId: administratorRoleId },
        include: { user: true },
      })
      if (existingAdministrator) {
        if (
          existingAdministrator.user.username.toLowerCase() !==
          input.HMS_BOOTSTRAP_ADMIN_USERNAME.toLowerCase()
        ) {
          throw new Error(
            'An administrator is already bootstrapped with another username.',
          )
        }
        return 'already_exists'
      }

      const existingUsername = await transaction.$queryRaw<{ id: string }[]>`
        SELECT id FROM users
        WHERE lower(username) =
          lower(${input.HMS_BOOTSTRAP_ADMIN_USERNAME})
        FOR UPDATE
      `
      if (existingUsername.length > 0) {
        throw new Error(
          'The bootstrap username already belongs to a non-administrator user.',
        )
      }

      const user = await transaction.user.create({
        data: {
          username: input.HMS_BOOTSTRAP_ADMIN_USERNAME,
          passwordHash,
          status: 'active',
        },
      })
      await transaction.userRole.create({
        data: {
          userId: user.id,
          roleId: administratorRoleId,
          assignedByUserId: null,
        },
      })
      await writeAudit(
        {
          actorUserId: user.id,
          action: 'identity.administrator_bootstrap',
          resourceType: 'user',
          resourceId: user.id,
          outcome: 'success',
          metadata: { mechanism: 'operator_cli' },
        },
        transaction,
      )
      return 'created'
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  )
}

try {
  const result = await bootstrap()
  console.info(
    result === 'created'
      ? 'Administrator bootstrap completed.'
      : 'Administrator already exists; no credentials were changed.',
  )
} catch (error) {
  console.error(
    error instanceof z.ZodError
      ? 'Bootstrap environment is invalid.'
      : error instanceof Error
        ? error.message
        : 'Administrator bootstrap failed.',
  )
  process.exitCode = 1
} finally {
  await database.disconnect()
}

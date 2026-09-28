import 'dotenv/config'
import { Prisma } from '@prisma/client'
import { syncApprovedRolePermissions } from '../auth/roleCatalog.js'
import { database } from '../database/database.service.js'

try {
  await database.client.$transaction(
    async (transaction) => {
      await transaction.$queryRaw`
        SELECT pg_advisory_xact_lock(
          hashtext('hms_role_permission_sync')
        )::text AS lock_result
      `
      await syncApprovedRolePermissions(transaction)
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  )
  console.info('Approved role permissions were synchronized.')
} catch (error) {
  console.error(
    error instanceof Error
      ? error.message
      : 'Role permission synchronization failed.',
  )
  process.exitCode = 1
} finally {
  await database.disconnect()
}

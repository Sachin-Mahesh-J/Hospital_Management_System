import 'dotenv/config'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { PERMISSIONS } from '../auth/auth.constants.js'
import { hashPassword, validatePasswordPolicy } from '../auth/password.service.js'
import { database } from '../database/database.service.js'
import { writeAudit } from '../modules/audit/audit.service.js'

const bootstrapSchema = z.object({
  HMS_BOOTSTRAP_ADMIN_USERNAME: z.string().trim().min(1).max(100),
  HMS_BOOTSTRAP_ADMIN_PASSWORD: z
    .string()
    .refine(validatePasswordPolicy, 'does not meet the HMS password policy'),
})

const roles = [
  ['administrator', 'Administrator', 'Manages HMS identity and access.'],
  ['doctor', 'Doctor', 'Clinical doctor role.'],
  ['nurse', 'Nurse', 'Nursing staff role.'],
  ['receptionist', 'Receptionist', 'Reception staff role.'],
  ['laboratory_staff', 'Laboratory Staff', 'Laboratory staff role.'],
  ['pharmacist', 'Pharmacist', 'Pharmacy staff role.'],
  ['accountant', 'Accountant', 'Accounting staff role.'],
] as const

const permissions = [
  [PERMISSIONS.identitySelfRead, 'Read own identity and access profile.'],
  [
    PERMISSIONS.identityPasswordChange,
    'Change own password after current-password verification.',
  ],
] as const

async function bootstrap(): Promise<'created' | 'already_exists'> {
  const input = bootstrapSchema.parse(process.env)
  const passwordHash = await hashPassword(
    input.HMS_BOOTSTRAP_ADMIN_PASSWORD,
  )

  return database.client.$transaction(
    async (transaction) => {
      await transaction.$queryRaw`
        SELECT pg_advisory_xact_lock(hashtext('hms_admin_bootstrap'))
      `

      const roleRows = new Map<string, string>()
      for (const [code, name, description] of roles) {
        const role = await transaction.role.upsert({
          where: { code },
          create: {
            code,
            name,
            description,
            status: 'active',
            isSystem: true,
          },
          update: {
            name,
            description,
            status: 'active',
            isSystem: true,
            updatedAt: new Date(),
          },
        })
        roleRows.set(code, role.id)
      }

      const permissionIds: string[] = []
      for (const [code, description] of permissions) {
        const permission = await transaction.permission.upsert({
          where: { code },
          create: { code, description },
          update: { description, updatedAt: new Date() },
        })
        permissionIds.push(permission.id)
      }

      for (const roleId of roleRows.values()) {
        for (const permissionId of permissionIds) {
          await transaction.rolePermission.upsert({
            where: {
              roleId_permissionId: { roleId, permissionId },
            },
            create: { roleId, permissionId },
            update: {},
          })
        }
      }

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

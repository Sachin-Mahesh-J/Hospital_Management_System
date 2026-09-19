import { Prisma } from '@prisma/client'
import {
  FAILED_LOGIN_LIMIT,
  REFRESH_ABSOLUTE_TTL_MS,
  REFRESH_IDLE_TTL_MS,
  TEMPORARY_LOCK_MS,
} from '../../auth/auth.constants.js'
import type { CurrentUser } from '../../auth/currentUser.js'
import {
  hashPassword,
  verifyPassword,
} from '../../auth/password.service.js'
import {
  createRefreshToken,
  hashUserAgent,
  issueAccessToken,
  parseRefreshSessionId,
  refreshTokenMatches,
} from '../../auth/token.service.js'
import { database } from '../../database/database.service.js'
import { AppError } from '../../errors/AppError.js'
import { writeAudit } from '../audit/audit.service.js'
import type { ChangePasswordBody, LoginBody } from './auth.schemas.js'

const dummyPasswordHash = hashPassword('not-a-real-user-password-1234')

const invalidCredentials = () =>
  new AppError(
    401,
    'INVALID_CREDENTIALS',
    'The username or password is invalid.',
  )

const invalidSession = () =>
  new AppError(401, 'INVALID_REFRESH_SESSION', 'The session is invalid or expired.')

type LockedUser = {
  id: string
  username: string
  passwordHash: string
  status: string
  passwordChangedAt: Date
  failedLoginCount: number
  lockedUntil: Date | null
}

type LockedSession = {
  id: string
  userId: string
  tokenHash: string
  expiresAt: Date
  idleExpiresAt: Date
  revokedAt: Date | null
  replacedBySessionId: string | null
}

async function lockUserByUsername(
  transaction: Prisma.TransactionClient,
  username: string,
): Promise<LockedUser | null> {
  const rows = await transaction.$queryRaw<LockedUser[]>`
    SELECT id, username, password_hash AS "passwordHash",
      status, password_changed_at AS "passwordChangedAt",
      failed_login_count AS "failedLoginCount",
      locked_until AS "lockedUntil"
    FROM users
    WHERE lower(username) = lower(${username})
    FOR UPDATE
  `
  return rows[0] ?? null
}

async function lockUserById(
  transaction: Prisma.TransactionClient,
  userId: string,
): Promise<LockedUser | null> {
  const rows = await transaction.$queryRaw<LockedUser[]>`
    SELECT id, username, password_hash AS "passwordHash",
      status, password_changed_at AS "passwordChangedAt",
      failed_login_count AS "failedLoginCount",
      locked_until AS "lockedUntil"
    FROM users
    WHERE id = ${userId}::uuid
    FOR UPDATE
  `
  return rows[0] ?? null
}

async function lockSession(
  transaction: Prisma.TransactionClient,
  sessionId: string,
): Promise<LockedSession | null> {
  const rows = await transaction.$queryRaw<LockedSession[]>`
    SELECT id, user_id AS "userId", token_hash AS "tokenHash",
      expires_at AS "expiresAt", idle_expires_at AS "idleExpiresAt",
      revoked_at AS "revokedAt",
      replaced_by_session_id AS "replacedBySessionId"
    FROM refresh_sessions
    WHERE id = ${sessionId}::uuid
    FOR UPDATE
  `
  return rows[0] ?? null
}

async function revokeSessionChain(
  transaction: Prisma.TransactionClient,
  sessionId: string,
  now: Date,
  reason: string,
): Promise<void> {
  await transaction.$executeRaw`
    WITH RECURSIVE session_chain AS (
      SELECT id, replaced_by_session_id
      FROM refresh_sessions
      WHERE id = ${sessionId}::uuid
      UNION ALL
      SELECT child.id, child.replaced_by_session_id
      FROM refresh_sessions child
      INNER JOIN session_chain parent
        ON child.id = parent.replaced_by_session_id
    )
    UPDATE refresh_sessions
    SET revoked_at = COALESCE(revoked_at, ${now}),
        revoke_reason = COALESCE(revoke_reason, ${reason})
    WHERE id IN (SELECT id FROM session_chain)
  `
}

const currentUserInclude = {
  roles: {
    where: { role: { status: 'active' } },
    include: {
      role: {
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      },
    },
  },
} satisfies Prisma.UserInclude

function toCurrentUser(
  user: Prisma.UserGetPayload<{ include: typeof currentUserInclude }>,
): CurrentUser {
  const roles = user.roles.map(({ role }) => role.code)
  const permissions = new Set(
    user.roles.flatMap(({ role }) =>
      role.permissions.map(({ permission }) => permission.code),
    ),
  )

  return {
    id: user.id,
    username: user.username,
    roles,
    permissions: [...permissions],
  }
}

export async function loadCurrentUser(
  userId: string,
  passwordVersion?: number,
): Promise<CurrentUser | null> {
  const user = await database.client.user.findUnique({
    where: { id: userId },
    include: currentUserInclude,
  })

  if (
    !user ||
    user.status !== 'active' ||
    (user.lockedUntil && user.lockedUntil > new Date()) ||
    (passwordVersion !== undefined &&
      user.passwordChangedAt.getTime() !== passwordVersion)
  ) {
    return null
  }

  return toCurrentUser(user)
}

export async function login(
  input: LoginBody,
  context: { requestId: string; userAgent?: string | undefined },
) {
  const result = await database.client.$transaction(
    async (transaction) => {
      const now = new Date()
      const user = await lockUserByUsername(transaction, input.username)

      if (!user) {
        await verifyPassword(await dummyPasswordHash, input.password)
        await writeAudit(
          {
            action: 'auth.login',
            resourceType: 'user',
            outcome: 'failure',
            requestId: context.requestId,
            metadata: { reason: 'invalid_credentials' },
          },
          transaction,
        )
        return { authenticated: false as const }
      }

      const eligible =
        user.status === 'active' &&
        (!user.lockedUntil || user.lockedUntil <= now)
      const passwordValid = await verifyPassword(user.passwordHash, input.password)

      if (!eligible || !passwordValid) {
        if (
          user.status === 'active' &&
          (!user.lockedUntil || user.lockedUntil <= now) &&
          !passwordValid
        ) {
          const failedLoginCount =
            user.lockedUntil && user.lockedUntil <= now
              ? 1
              : user.failedLoginCount + 1
          const lockedUntil =
            failedLoginCount >= FAILED_LOGIN_LIMIT
              ? new Date(now.getTime() + TEMPORARY_LOCK_MS)
              : null
          await transaction.user.update({
            where: { id: user.id },
            data: { failedLoginCount, lockedUntil, updatedAt: now },
          })

          if (lockedUntil) {
            await writeAudit(
              {
                actorUserId: user.id,
                action: 'auth.temporary_lock',
                resourceType: 'user',
                resourceId: user.id,
                outcome: 'denied',
                requestId: context.requestId,
                metadata: { failedLoginCount },
              },
              transaction,
            )
          }
        }

        await writeAudit(
          {
            actorUserId: user.id,
            action: 'auth.login',
            resourceType: 'user',
            resourceId: user.id,
            outcome: 'failure',
            requestId: context.requestId,
            metadata: {
              reason:
                user.status === 'active' ? 'invalid_credentials' : 'account_status',
            },
          },
          transaction,
        )
        return { authenticated: false as const }
      }

      const refresh = createRefreshToken()
      const expiresAt = new Date(now.getTime() + REFRESH_ABSOLUTE_TTL_MS)
      await transaction.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: 0,
          lockedUntil: null,
          lastLoginAt: now,
          updatedAt: now,
        },
      })
      await transaction.refreshSession.create({
        data: {
          id: refresh.sessionId,
          userId: user.id,
          tokenHash: refresh.hash,
          expiresAt,
          idleExpiresAt: new Date(now.getTime() + REFRESH_IDLE_TTL_MS),
          userAgentHash: hashUserAgent(context.userAgent),
        },
      })
      await writeAudit(
        {
          actorUserId: user.id,
          action: 'auth.login',
          resourceType: 'refresh_session',
          resourceId: refresh.sessionId,
          outcome: 'success',
          requestId: context.requestId,
        },
        transaction,
      )

      const profile = await transaction.user.findUniqueOrThrow({
        where: { id: user.id },
        include: currentUserInclude,
      })
      return {
        authenticated: true as const,
        accessToken: await issueAccessToken(user.id, user.passwordChangedAt),
        refreshToken: refresh.raw,
        user: toCurrentUser(profile),
      }
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  )

  if (!result.authenticated) {
    throw invalidCredentials()
  }

  return result
}

export async function refresh(
  rawToken: string | undefined,
  context: { requestId: string; userAgent?: string | undefined },
) {
  const sessionId = rawToken ? parseRefreshSessionId(rawToken) : null
  if (!rawToken || !sessionId) {
    throw invalidSession()
  }

  const result = await database.client.$transaction(
    async (transaction) => {
      const now = new Date()
      const session = await lockSession(transaction, sessionId)

      if (!session || !refreshTokenMatches(session.tokenHash, rawToken)) {
        return { refreshed: false as const }
      }

      if (session.revokedAt) {
        await revokeSessionChain(
          transaction,
          session.id,
          now,
          'refresh_token_reuse',
        )
        await writeAudit(
          {
            actorUserId: session.userId,
            action: 'auth.refresh_reuse',
            resourceType: 'refresh_session',
            resourceId: session.id,
            outcome: 'denied',
            requestId: context.requestId,
          },
          transaction,
        )
        return { refreshed: false as const }
      }

      if (session.expiresAt <= now || session.idleExpiresAt <= now) {
        const reason =
          session.expiresAt <= now ? 'absolute_expiry' : 'idle_expiry'
        await transaction.refreshSession.update({
          where: { id: session.id },
          data: { revokedAt: now, revokeReason: reason },
        })
        await writeAudit(
          {
            actorUserId: session.userId,
            action: 'auth.refresh',
            resourceType: 'refresh_session',
            resourceId: session.id,
            outcome: 'failure',
            requestId: context.requestId,
            metadata: { reason },
          },
          transaction,
        )
        return { refreshed: false as const }
      }

      const user = await lockUserById(transaction, session.userId)
      if (!user || user.status !== 'active') {
        await revokeSessionChain(transaction, session.id, now, 'account_inactive')
        await writeAudit(
          {
            actorUserId: session.userId,
            action: 'auth.refresh',
            resourceType: 'refresh_session',
            resourceId: session.id,
            outcome: 'denied',
            requestId: context.requestId,
            metadata: { reason: 'account_inactive' },
          },
          transaction,
        )
        return { refreshed: false as const }
      }

      const replacement = createRefreshToken()
      const idleExpiresAt = new Date(
        Math.min(
          now.getTime() + REFRESH_IDLE_TTL_MS,
          session.expiresAt.getTime(),
        ),
      )
      await transaction.refreshSession.create({
        data: {
          id: replacement.sessionId,
          userId: user.id,
          tokenHash: replacement.hash,
          expiresAt: session.expiresAt,
          idleExpiresAt,
          userAgentHash: hashUserAgent(context.userAgent),
        },
      })
      await transaction.refreshSession.update({
        where: { id: session.id },
        data: {
          revokedAt: now,
          revokeReason: 'rotated',
          replacedBySessionId: replacement.sessionId,
          lastUsedAt: now,
        },
      })
      await writeAudit(
        {
          actorUserId: user.id,
          action: 'auth.refresh',
          resourceType: 'refresh_session',
          resourceId: replacement.sessionId,
          outcome: 'success',
          requestId: context.requestId,
          metadata: { replacedSessionId: session.id },
        },
        transaction,
      )

      return {
        refreshed: true as const,
        accessToken: await issueAccessToken(user.id, user.passwordChangedAt),
        refreshToken: replacement.raw,
      }
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  )

  if (!result.refreshed) {
    throw invalidSession()
  }

  return result
}

export async function logout(
  rawToken: string | undefined,
  requestId: string,
): Promise<void> {
  const sessionId = rawToken ? parseRefreshSessionId(rawToken) : null
  if (!rawToken || !sessionId) {
    return
  }

  await database.client.$transaction(async (transaction) => {
    const session = await lockSession(transaction, sessionId)
    if (!session || !refreshTokenMatches(session.tokenHash, rawToken)) {
      return
    }

    const now = new Date()
    if (session.revokedAt) {
      await revokeSessionChain(
        transaction,
        session.id,
        now,
        'refresh_token_reuse',
      )
      await writeAudit(
        {
          actorUserId: session.userId,
          action: 'auth.refresh_reuse',
          resourceType: 'refresh_session',
          resourceId: session.id,
          outcome: 'denied',
          requestId,
          metadata: { detectedDuring: 'logout' },
        },
        transaction,
      )
    } else {
      await transaction.refreshSession.update({
        where: { id: session.id },
        data: { revokedAt: now, revokeReason: 'logout' },
      })
      await writeAudit(
        {
          actorUserId: session.userId,
          action: 'auth.logout',
          resourceType: 'refresh_session',
          resourceId: session.id,
          outcome: 'success',
          requestId,
        },
        transaction,
      )
    }
  })
}

export async function changePassword(
  userId: string,
  input: ChangePasswordBody,
  requestId: string,
): Promise<void> {
  await database.client.$transaction(
    async (transaction) => {
      const user = await lockUserById(transaction, userId)
      if (
        !user ||
        user.status !== 'active' ||
        !(await verifyPassword(user.passwordHash, input.currentPassword))
      ) {
        throw new AppError(
          400,
          'CURRENT_PASSWORD_INVALID',
          'The current password is invalid.',
        )
      }

      const now = new Date()
      const passwordHash = await hashPassword(input.newPassword)
      await transaction.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          passwordChangedAt: now,
          failedLoginCount: 0,
          lockedUntil: null,
          updatedAt: now,
        },
      })
      await transaction.refreshSession.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: now, revokeReason: 'password_changed' },
      })
      await writeAudit(
        {
          actorUserId: user.id,
          action: 'auth.password_change',
          resourceType: 'user',
          resourceId: user.id,
          outcome: 'success',
          requestId,
        },
        transaction,
      )
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  )
}

import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import request from 'supertest'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
} from 'vitest'
import { PERMISSIONS } from '../../src/auth/auth.constants.js'
import { hashPassword, verifyPassword } from '../../src/auth/password.service.js'
import { createApp } from '../../src/app.js'
import { database } from '../../src/database/database.service.js'

const prisma = new PrismaClient()
const app = createApp()
const origin = 'http://localhost:5173'
const csrfHeaders = { Origin: origin, 'X-HMS-CSRF': '1' }
const testPrefix = 'auth-test-'
let roleId: string
let secondaryRoleId: string
let selfPermissionId: string

function assertSafeTestTarget(): void {
  if (process.env.HMS_DATABASE_TESTS !== 'true' || !process.env.DATABASE_URL) {
    throw new Error('Auth database tests require the guarded database runner.')
  }
  const url = new URL(process.env.DATABASE_URL)
  if (
    !['localhost', '127.0.0.1', '::1'].includes(url.hostname) ||
    url.pathname.replace(/^\//, '') !== 'hms_test'
  ) {
    throw new Error('Refusing to run auth tests outside local hms_test.')
  }
}

assertSafeTestTarget()

function username(label = 'user'): string {
  return `${testPrefix}${label}-${randomUUID()}`
}

async function createUser(options: {
  username?: string
  password?: string
  status?: string
  failedLoginCount?: number
  lockedUntil?: Date | null
  roleIds?: string[]
} = {}) {
  const plainPassword = options.password ?? 'Valid password 42'
  const user = await prisma.user.create({
    data: {
      username: options.username ?? username(),
      passwordHash: await hashPassword(plainPassword),
      status: options.status ?? 'active',
      failedLoginCount: options.failedLoginCount ?? 0,
      ...(options.lockedUntil !== undefined
        ? { lockedUntil: options.lockedUntil }
        : {}),
      roles: {
        create: (options.roleIds ?? [roleId]).map((assignedRoleId) => ({
          roleId: assignedRoleId,
        })),
      },
    },
  })
  return { user, plainPassword }
}

function cookieFrom(response: request.Response): string {
  const setCookie = response.headers['set-cookie']
  const first = Array.isArray(setCookie) ? setCookie[0] : setCookie
  if (!first) {
    throw new Error('Expected a refresh cookie.')
  }
  return first.split(';', 1)[0]!
}

function setCookieHeader(response: request.Response): string {
  const setCookie = response.headers['set-cookie']
  const first = Array.isArray(setCookie) ? setCookie[0] : setCookie
  if (!first) {
    throw new Error('Expected a Set-Cookie header.')
  }
  return first
}

async function login(usernameValue: string, password: string) {
  return request(app)
    .post('/api/v1/auth/login')
    .set(csrfHeaders)
    .send({ username: usernameValue, password })
}

beforeAll(async () => {
  const selfPermission = await prisma.permission.upsert({
    where: { code: PERMISSIONS.identitySelfRead },
    create: {
      code: PERMISSIONS.identitySelfRead,
      description: 'Read own profile.',
    },
    update: {},
  })
  selfPermissionId = selfPermission.id
  const passwordPermission = await prisma.permission.upsert({
    where: { code: PERMISSIONS.identityPasswordChange },
    create: {
      code: PERMISSIONS.identityPasswordChange,
      description: 'Change own password.',
    },
    update: {},
  })
  const role = await prisma.role.upsert({
    where: { code: 'auth_test_user' },
    create: {
      code: 'auth_test_user',
      name: 'Auth Test User',
      isSystem: false,
    },
    update: {},
  })
  roleId = role.id
  const secondary = await prisma.role.upsert({
    where: { code: 'auth_test_secondary' },
    create: {
      code: 'auth_test_secondary',
      name: 'Auth Test Secondary',
      isSystem: false,
    },
    update: {},
  })
  secondaryRoleId = secondary.id
  for (const permissionId of [selfPermission.id, passwordPermission.id]) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: role.id, permissionId },
      },
      create: { roleId: role.id, permissionId },
      update: {},
    })
  }
})

afterEach(async () => {
  await prisma.auditLog.deleteMany()
  await prisma.refreshSession.deleteMany()
  await prisma.userRole.deleteMany({
    where: { user: { username: { startsWith: testPrefix } } },
  })
  await prisma.user.deleteMany({
    where: { username: { startsWith: testPrefix } },
  })
})

afterAll(async () => {
  await prisma.rolePermission.deleteMany({
    where: { roleId: { in: [roleId, secondaryRoleId] } },
  })
  await prisma.role.deleteMany({
    where: { id: { in: [roleId, secondaryRoleId] } },
  })
  await prisma.permission.deleteMany({
    where: {
      id: selfPermissionId,
      roles: { none: {} },
    },
  })
  await database.disconnect()
  await prisma.$disconnect()
})

describe('authentication API', () => {
  it('logs in, resets failures, creates a hashed session, and audits safely', async () => {
    const { user, plainPassword } = await createUser({ failedLoginCount: 3 })
    const response = await login(user.username, plainPassword)

    expect(response.status).toBe(200)
    expect(response.body.data.accessToken).toEqual(expect.any(String))
    expect(response.body.data.user).toMatchObject({
      id: user.id,
      username: user.username,
      permissions: expect.arrayContaining([
        PERMISSIONS.identitySelfRead,
        PERMISSIONS.identityPasswordChange,
      ]),
    })
    expect(setCookieHeader(response)).toContain('HttpOnly')

    const storedUser = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    })
    expect(storedUser.failedLoginCount).toBe(0)
    const session = await prisma.refreshSession.findFirstOrThrow({
      where: { userId: user.id },
    })
    expect(session.tokenHash).not.toContain(cookieFrom(response))

    const audits = await prisma.auditLog.findMany({ where: { actorUserId: user.id } })
    expect(audits.some((event) => event.action === 'auth.login')).toBe(true)
    expect(JSON.stringify(audits)).not.toContain(plainPassword)
    expect(JSON.stringify(audits)).not.toContain(response.body.data.accessToken)
  })

  it('returns the same failure for an invalid password and unknown username', async () => {
    const { user } = await createUser()
    const invalid = await login(user.username, 'Wrong password 42')
    const unknown = await login(username('missing'), 'Wrong password 42')

    expect(invalid.status).toBe(401)
    expect(unknown.status).toBe(401)
    expect(invalid.body.error).toMatchObject({
      code: 'INVALID_CREDENTIALS',
      message: 'The username or password is invalid.',
    })
    expect(unknown.body.error.code).toBe(invalid.body.error.code)
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: user.id } }))
        .failedLoginCount,
    ).toBe(1)
  })

  it.each(['disabled', 'locked', 'pending'])(
    'rejects a user with %s status generically',
    async (status) => {
      const { user, plainPassword } = await createUser({ status })
      const response = await login(user.username, plainPassword)
      expect(response.status).toBe(401)
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS')
    },
  )

  it('temporarily locks after five consecutive failures', async () => {
    const { user } = await createUser()
    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect((await login(user.username, 'Wrong password 42')).status).toBe(401)
    }

    const stored = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
    expect(stored.failedLoginCount).toBe(5)
    expect(stored.lockedUntil!.getTime()).toBeGreaterThan(Date.now())
    const lockAudit = await prisma.auditLog.findFirst({
      where: { actorUserId: user.id, action: 'auth.temporary_lock' },
    })
    expect(lockAudit).not.toBeNull()
  })

  it('rotates refresh tokens and invalidates the descendant on replay', async () => {
    const { user, plainPassword } = await createUser()
    const loginResponse = await login(user.username, plainPassword)
    const originalCookie = cookieFrom(loginResponse)
    const refreshed = await request(app)
      .post('/api/v1/auth/refresh')
      .set(csrfHeaders)
      .set('Cookie', originalCookie)
    expect(refreshed.status).toBe(200)
    const replacementCookie = cookieFrom(refreshed)

    const replay = await request(app)
      .post('/api/v1/auth/refresh')
      .set(csrfHeaders)
      .set('Cookie', originalCookie)
    expect(replay.status).toBe(401)

    const replacementAttempt = await request(app)
      .post('/api/v1/auth/refresh')
      .set(csrfHeaders)
      .set('Cookie', replacementCookie)
    expect(replacementAttempt.status).toBe(401)
    expect(
      await prisma.auditLog.findFirst({
        where: { actorUserId: user.id, action: 'auth.refresh_reuse' },
      }),
    ).not.toBeNull()
  })

  it.each([
    ['absolute expiry', 'absolute'],
    ['idle expiry', 'idle'],
    ['revocation', 'revoked'],
  ])('rejects refresh after %s', async (_label, state) => {
    const { user, plainPassword } = await createUser()
    const loginResponse = await login(user.username, plainPassword)
    const session = await prisma.refreshSession.findFirstOrThrow({
      where: { userId: user.id },
    })
    const now = Date.now()
    if (state === 'absolute') {
      await prisma.refreshSession.update({
        where: { id: session.id },
        data: {
          createdAt: new Date(now - 3_600_000),
          idleExpiresAt: new Date(now - 1_000),
          expiresAt: new Date(now - 500),
        },
      })
    } else if (state === 'idle') {
      await prisma.refreshSession.update({
        where: { id: session.id },
        data: {
          createdAt: new Date(now - 3_600_000),
          idleExpiresAt: new Date(now - 1_000),
        },
      })
    } else {
      await prisma.refreshSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date(), revokeReason: 'test' },
      })
    }

    const response = await request(app)
      .post('/api/v1/auth/refresh')
      .set(csrfHeaders)
      .set('Cookie', cookieFrom(loginResponse))
    expect(response.status).toBe(401)
  })

  it('revokes the current session and clears the cookie on logout', async () => {
    const { user, plainPassword } = await createUser()
    const loginResponse = await login(user.username, plainPassword)
    const response = await request(app)
      .post('/api/v1/auth/logout')
      .set(csrfHeaders)
      .set('Cookie', cookieFrom(loginResponse))

    expect(response.status).toBe(204)
    expect(setCookieHeader(response)).toContain('Expires=')
    const session = await prisma.refreshSession.findFirstOrThrow({
      where: { userId: user.id },
    })
    expect(session.revokedAt).not.toBeNull()
    expect(session.revokeReason).toBe('logout')
  })

  it('changes a password, revokes sessions, and rejects the old access token', async () => {
    const { user, plainPassword } = await createUser()
    const loginResponse = await login(user.username, plainPassword)
    const oldHash = (
      await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
    ).passwordHash
    const accessToken = loginResponse.body.data.accessToken as string
    const newPassword = 'Replacement password 84'

    const wrong = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: 'Wrong password 42', newPassword })
    expect(wrong.status).toBe(400)

    const changed = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: plainPassword, newPassword })
    expect(changed.status).toBe(204)

    const stored = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
    expect(stored.passwordHash).not.toBe(oldHash)
    await expect(verifyPassword(stored.passwordHash, newPassword)).resolves.toBe(true)
    expect(
      await prisma.refreshSession.count({
        where: { userId: user.id, revokedAt: null },
      }),
    ).toBe(0)
    await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(401)
  })

  it('enforces authentication and aggregated permissions', async () => {
    await request(app).get('/api/v1/auth/me').expect(401)

    const deniedUser = await createUser({ roleIds: [secondaryRoleId] })
    const deniedLogin = await login(
      deniedUser.user.username,
      deniedUser.plainPassword,
    )
    await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${deniedLogin.body.data.accessToken}`)
      .expect(403)

    await prisma.rolePermission.create({
      data: { roleId: secondaryRoleId, permissionId: selfPermissionId },
    })
    const multiRoleUser = await createUser({
      roleIds: [roleId, secondaryRoleId],
    })
    const allowedLogin = await login(
      multiRoleUser.user.username,
      multiRoleUser.plainPassword,
    )
    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${allowedLogin.body.data.accessToken}`)
    expect(response.status).toBe(200)
    expect(response.body.data.roles).toEqual(
      expect.arrayContaining(['auth_test_user', 'auth_test_secondary']),
    )
  })

  it('requires an allowlisted origin and CSRF header for cookie auth', async () => {
    const { user, plainPassword } = await createUser()
    await request(app)
      .post('/api/v1/auth/login')
      .send({ username: user.username, password: plainPassword })
      .expect(403)
    await request(app)
      .post('/api/v1/auth/login')
      .set('Origin', 'https://attacker.example')
      .set('X-HMS-CSRF', '1')
      .send({ username: user.username, password: plainPassword })
      .expect(403)
  })
})

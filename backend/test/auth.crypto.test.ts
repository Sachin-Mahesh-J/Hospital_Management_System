import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { SignJWT } from 'jose'
import { describe, expect, it } from 'vitest'
import {
  hashPassword,
  validatePasswordPolicy,
  verifyPassword,
} from '../src/auth/password.service.js'
import {
  createRefreshToken,
  issueAccessToken,
  parseRefreshSessionId,
  refreshTokenMatches,
  verifyAccessToken,
} from '../src/auth/token.service.js'

const key = (value: string) => new TextEncoder().encode(value)

async function customToken(options: {
  secret?: string
  issuer?: string
  audience?: string
  expires?: string
}) {
  return new SignJWT({ pva: 1 })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(randomUUID())
    .setJti(randomUUID())
    .setIssuer(options.issuer ?? 'hms-test-api')
    .setAudience(options.audience ?? 'hms-test-web')
    .setIssuedAt()
    .setExpirationTime(options.expires ?? '15m')
    .sign(
      key(
        options.secret ??
          'test-only-access-secret-that-is-at-least-32-characters',
      ),
    )
}

describe('password security', () => {
  it('hashes and verifies passwords with Argon2id', async () => {
    const password = 'Correct horse 42'
    const hash = await hashPassword(password)

    expect(hash).toMatch(/^\$argon2id\$/)
    expect(hash).not.toContain(password)
    await expect(verifyPassword(hash, password)).resolves.toBe(true)
    await expect(verifyPassword(hash, 'Wrong password 42')).resolves.toBe(false)
  })

  it('enforces the documented password policy', () => {
    expect(validatePasswordPolicy('Long passphrase 42')).toBe(true)
    expect(validatePasswordPolicy('alllettersonly')).toBe(false)
    expect(validatePasswordPolicy('123456789012')).toBe(false)
    expect(validatePasswordPolicy('aaaaaaaaaaa1')).toBe(false)
  })

  it('keeps login password hashing, JWT signing, and RBAC reads outside the interactive transaction', () => {
    const source = readFileSync(
      join(
        dirname(fileURLToPath(import.meta.url)),
        '../src/modules/auth/auth.service.ts',
      ),
      'utf8',
    )
    const loginStart = source.indexOf('export async function login(')
    const loginEnd = source.indexOf('export async function refresh(')
    expect(loginStart).toBeGreaterThan(-1)
    expect(loginEnd).toBeGreaterThan(loginStart)

    const loginSource = source.slice(loginStart, loginEnd)
    const transactionIndex = loginSource.indexOf('$transaction')
    const isolationIndex = loginSource.indexOf(
      'TransactionIsolationLevel.Serializable',
    )
    expect(transactionIndex).toBeGreaterThan(-1)
    expect(isolationIndex).toBeGreaterThan(transactionIndex)

    const beforeTransaction = loginSource.slice(0, transactionIndex)
    const insideTransaction = loginSource.slice(transactionIndex, isolationIndex)
    const afterTransaction = loginSource.slice(isolationIndex)

    expect(beforeTransaction).toMatch(/verifyPassword\s*\(/)
    expect(insideTransaction).not.toMatch(/verifyPassword\s*\(/)
    expect(insideTransaction).not.toMatch(/hashPassword\s*\(/)
    expect(insideTransaction).not.toMatch(/issueAccessToken\s*\(/)
    expect(insideTransaction).not.toMatch(/findUniqueOrThrow/)
    expect(insideTransaction).toMatch(/lockUserByUsername\(/)
    expect(insideTransaction).toMatch(/refreshSession\.create/)
    expect(afterTransaction).toMatch(/issueAccessToken\s*\(/)
    expect(afterTransaction).toMatch(/findUniqueOrThrow/)
    expect(loginSource).toMatch(/TransactionIsolationLevel\.Serializable/)
    expect(loginSource).toMatch(/lockUserByUsername\(/)
    expect(loginSource).not.toMatch(/timeout\s*:/)
    expect(source.slice(0, loginStart)).toMatch(
      /WHERE lower\(username\) = lower\(\$\{username\}\)\s+FOR UPDATE/,
    )
  })
})

describe('access JWTs', () => {
  it('accepts a valid minimal token', async () => {
    const userId = randomUUID()
    const changedAt = new Date()
    const token = await issueAccessToken(userId, changedAt)

    await expect(verifyAccessToken(token)).resolves.toMatchObject({
      sub: userId,
      pva: changedAt.getTime(),
    })
  })

  it.each([
    ['expired', () => customToken({ expires: '-1s' })],
    ['invalid signature', () => customToken({ secret: 'x'.repeat(40) })],
    ['wrong issuer', () => customToken({ issuer: 'another-api' })],
    ['wrong audience', () => customToken({ audience: 'another-client' })],
    ['malformed', async () => 'not-a-jwt'],
  ])('rejects %s tokens', async (_case, createToken) => {
    await expect(verifyAccessToken(await createToken())).rejects.toBeDefined()
  })
})

describe('refresh tokens', () => {
  it('contains a lookup identifier while matching only by hash', () => {
    const token = createRefreshToken()

    expect(parseRefreshSessionId(token.raw)).toBe(token.sessionId)
    expect(refreshTokenMatches(token.hash, token.raw)).toBe(true)
    expect(refreshTokenMatches(token.hash, `${token.raw}x`)).toBe(false)
    expect(token.hash).not.toContain(token.raw)
  })
})

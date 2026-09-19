import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto'
import { jwtVerify, SignJWT } from 'jose'
import { z } from 'zod'
import { env } from '../config/env.js'
import { ACCESS_TOKEN_TTL_SECONDS } from './auth.constants.js'

const accessClaimsSchema = z.object({
  sub: z.string().uuid(),
  jti: z.string().uuid(),
  iat: z.number().int().nonnegative(),
  exp: z.number().int().positive(),
  pva: z.number().int().nonnegative(),
})

export type AccessClaims = z.infer<typeof accessClaimsSchema>

function signingKey(): Uint8Array {
  return new TextEncoder().encode(env.jwt.accessSecret)
}

export async function issueAccessToken(
  userId: string,
  passwordChangedAt: Date,
): Promise<string> {
  return new SignJWT({ pva: passwordChangedAt.getTime() })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(userId)
    .setIssuer(env.jwt.issuer)
    .setAudience(env.jwt.audience)
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(signingKey())
}

export async function verifyAccessToken(token: string): Promise<AccessClaims> {
  const result = await jwtVerify(token, signingKey(), {
    algorithms: ['HS256'],
    issuer: env.jwt.issuer,
    audience: env.jwt.audience,
  })

  return accessClaimsSchema.parse(result.payload)
}

export type RefreshToken = {
  sessionId: string
  raw: string
  hash: string
}

export function createRefreshToken(sessionId = randomUUID()): RefreshToken {
  const secret = randomBytes(32).toString('base64url')
  const raw = `${sessionId}.${secret}`
  return { sessionId, raw, hash: hashRefreshToken(raw) }
}

export function parseRefreshSessionId(token: string): string | null {
  const separator = token.indexOf('.')
  if (separator < 1) {
    return null
  }

  const sessionId = token.slice(0, separator)
  return z.string().uuid().safeParse(sessionId).success ? sessionId : null
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function refreshTokenMatches(storedHash: string, token: string): boolean {
  const actual = Buffer.from(hashRefreshToken(token), 'hex')
  const expected = Buffer.from(storedHash, 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export function hashUserAgent(userAgent: string | undefined): string | null {
  if (!userAgent) {
    return null
  }

  return createHash('sha256').update(userAgent).digest('hex')
}

import argon2 from 'argon2'

const COMMON_PASSWORDS = new Set([
  'password1234',
  'qwerty123456',
  'administrator1',
  'letmein123456',
])

export const PASSWORD_MIN_LENGTH = 12
export const PASSWORD_MAX_LENGTH = 128

export function validatePasswordPolicy(password: string): boolean {
  if (
    password.length < PASSWORD_MIN_LENGTH ||
    password.length > PASSWORD_MAX_LENGTH ||
    !/\p{L}/u.test(password) ||
    !/\p{N}/u.test(password) ||
    new Set(password.toLowerCase()).size < 4
  ) {
    return false
  }

  return !COMMON_PASSWORDS.has(password.toLowerCase())
}

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
    hashLength: 32,
  })
}

export async function verifyPassword(
  hash: string,
  password: string,
): Promise<boolean> {
  try {
    return await argon2.verify(hash, password)
  } catch {
    return false
  }
}

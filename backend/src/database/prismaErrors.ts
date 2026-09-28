import { Prisma } from '@prisma/client'

function constraintTokens(error: Prisma.PrismaClientKnownRequestError): string[] {
  const target = error.meta?.target
  if (Array.isArray(target)) return target.map(String)
  if (typeof target === 'string') return [target]
  return []
}

export function isUniqueConstraint(
  error: unknown,
  constraintNames: readonly string[],
): boolean {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== 'P2002'
  ) {
    return false
  }
  const tokens = constraintTokens(error)
  return constraintNames.some((name) =>
    tokens.some((token) => token === name || token.includes(name)),
  )
}

export function isCheckConstraint(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2004'
  )
}

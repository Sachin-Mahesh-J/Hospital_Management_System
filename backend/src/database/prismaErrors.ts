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

function errorText(error: unknown): string {
  if (error == null) return ''
  if (typeof error === 'string') return error
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return `${error.message} ${JSON.stringify(error.meta ?? {})}`
  }
  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return error.message
  }
  if (error instanceof Error) {
    const cause = 'cause' in error ? errorText(error.cause) : ''
    return `${error.message} ${cause}`
  }
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

export function isExclusionConstraint(
  error: unknown,
  constraintName: string,
): boolean {
  return errorText(error).includes(constraintName)
}

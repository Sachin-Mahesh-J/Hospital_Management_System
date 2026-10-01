export const LOCAL_OVERRIDE_ENV = 'HMS_DEMO_SEED_ALLOW_LOCAL'
export const REMOTE_CONFIRM_ENV = 'HMS_DEMO_SEED_CONFIRM'
export const REMOTE_CONFIRM_VALUE = 'CLEAR_AND_RESEED_HMS_DEMO'

export type DatabaseKind = 'local' | 'remote'

export type DatabaseTarget = {
  kind: DatabaseKind
  provider: 'localhost' | 'supabase' | 'other'
}

function parseHost(databaseUrl: string): string {
  try {
    return new URL(databaseUrl).hostname.toLowerCase()
  } catch {
    throw new Error('DATABASE_URL is not a valid URL.')
  }
}

export function classifyDatabaseUrl(databaseUrl: string): DatabaseTarget {
  const host = parseHost(databaseUrl)
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host.endsWith('.local')
  ) {
    return { kind: 'local', provider: 'localhost' }
  }
  if (host.endsWith('.supabase.co') || host.endsWith('.supabase.net')) {
    return { kind: 'remote', provider: 'supabase' }
  }
  return { kind: 'remote', provider: 'other' }
}

export function describeTarget(target: DatabaseTarget): string {
  if (target.kind === 'local') {
    return 'local development database'
  }
  if (target.provider === 'supabase') {
    return 'remote Supabase PostgreSQL database'
  }
  return 'remote PostgreSQL database'
}

export function assertSeedAllowed(
  target: DatabaseTarget,
  env: NodeJS.ProcessEnv,
): void {
  if (target.kind === 'local') {
    if (env[LOCAL_OVERRIDE_ENV] !== 'true') {
      throw new Error(
        `Refusing to seed a local database. Set ${LOCAL_OVERRIDE_ENV}=true to override.`,
      )
    }
    return
  }
  if (env[REMOTE_CONFIRM_ENV] !== REMOTE_CONFIRM_VALUE) {
    throw new Error(
      `Refusing to seed a ${describeTarget(target)}. Set ${REMOTE_CONFIRM_ENV}=${REMOTE_CONFIRM_VALUE} to confirm.`,
    )
  }
}

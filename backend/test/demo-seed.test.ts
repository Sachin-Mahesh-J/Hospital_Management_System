import { describe, expect, it } from 'vitest'
import { loginBodySchema } from '../src/modules/auth/auth.schemas.js'
import { createUserBodySchema } from '../src/modules/users/user.schemas.js'
import { validatePasswordPolicy } from '../src/auth/password.service.js'
import {
  DEMO_ACCOUNTS,
  DEMO_PASSWORD,
  DEMO_USERNAMES,
} from '../src/scripts/demo-seed/accounts.js'
import { isDryRunRequested } from '../src/scripts/demo-seed/args.js'
import {
  LOCAL_OVERRIDE_ENV,
  REMOTE_CONFIRM_ENV,
  REMOTE_CONFIRM_VALUE,
  assertSeedAllowed,
  classifyDatabaseUrl,
} from '../src/scripts/demo-seed/safety.js'
import {
  demoUsernamesThatWouldBeCreated,
  expectedScheduleCount,
  expectedSeedOperationCounts,
  tablesThatWouldBeCleared,
} from '../src/scripts/demo-seed/plan.js'

describe('demo seed credentials', () => {
  it('uses simple usernames that satisfy existing username validation', () => {
    expect(demoUsernamesThatWouldBeCreated()).toEqual([
      'admin',
      'admin.ops',
      'doctor',
      'doctor.cardio',
      'doctor.pediatrics',
      'doctor.ortho',
      'doctor.derma',
      'nurse',
      'reception',
      'lab',
      'pharmacist',
      'accountant',
      'reception.inactive',
      'nurse.inactive',
    ])

    for (const account of DEMO_ACCOUNTS) {
      expect(
        loginBodySchema.parse({
          username: account.username,
          password: DEMO_PASSWORD,
        }),
      ).toMatchObject({ username: account.username })
      expect(
        createUserBodySchema.parse({
          username: ` ${account.username} `,
          password: 'Valid password 42',
          roleCode: account.role,
        }),
      ).toMatchObject({ username: account.username, roleCode: account.role })
    }
  })

  it('uses one shared demo password accepted by login, not user-create policy', () => {
    expect(DEMO_PASSWORD).toBe('HmsDemo@123')
    expect(DEMO_PASSWORD.length).toBe(11)
    expect(validatePasswordPolicy(DEMO_PASSWORD)).toBe(false)
    expect(
      loginBodySchema.parse({
        username: DEMO_USERNAMES.admin,
        password: DEMO_PASSWORD,
      }),
    ).toMatchObject({ username: 'admin', password: DEMO_PASSWORD })
    expect(DEMO_ACCOUNTS).toHaveLength(14)
    expect(DEMO_USERNAMES.reception).toBe('reception')
  })
})

describe('demo seed dry-run detection', () => {
  it('treats argv, dedicated env, and npm-consumed --dry-run as dry-run', () => {
    expect(isDryRunRequested(['--dry-run'], {})).toBe(true)
    expect(isDryRunRequested([], { HMS_DEMO_SEED_DRY_RUN: 'true' })).toBe(true)
    expect(isDryRunRequested([], { npm_config_dry_run: 'true' })).toBe(true)
    expect(isDryRunRequested([], {})).toBe(false)
  })

  it('does not require destructive confirmation merely to inspect', () => {
    expect(tablesThatWouldBeCleared()).toContain('users')
    expect(tablesThatWouldBeCleared()).not.toContain('roles')
    expect(expectedSeedOperationCounts('2026-10-01').users).toBe(14)
    expect(expectedScheduleCount('2026-10-01')).toBeGreaterThan(0)
  })
})

describe('demo seed safety', () => {
  it('still requires explicit confirmation for local and remote destructive seeds', () => {
    expect(() =>
      assertSeedAllowed(classifyDatabaseUrl('postgresql://x@localhost:5432/hms'), {}),
    ).toThrow(LOCAL_OVERRIDE_ENV)
    expect(() =>
      assertSeedAllowed(
        classifyDatabaseUrl('postgresql://x@db.example.supabase.co:5432/postgres'),
        {},
      ),
    ).toThrow(REMOTE_CONFIRM_ENV)
    expect(() =>
      assertSeedAllowed(
        classifyDatabaseUrl('postgresql://x@db.example.supabase.co:5432/postgres'),
        { [REMOTE_CONFIRM_ENV]: REMOTE_CONFIRM_VALUE },
      ),
    ).not.toThrow()
  })
})

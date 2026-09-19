import { describe, expect, it } from 'vitest'
import type { CurrentUser } from '../api/auth'
import { hasPermission } from './permission'

const user: CurrentUser = {
  id: 'user-1',
  username: 'clinician',
  roles: ['doctor', 'auditor'],
  permissions: ['identity.self.read', 'identity.password.change'],
}

describe('permission-aware UI helper', () => {
  it('uses resolved permissions and denies anonymous or missing access', () => {
    expect(hasPermission(user, 'identity.self.read')).toBe(true)
    expect(hasPermission(user, 'patient.read')).toBe(false)
    expect(hasPermission(null, 'identity.self.read')).toBe(false)
  })
})

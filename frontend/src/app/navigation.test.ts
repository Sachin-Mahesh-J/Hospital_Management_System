import { describe, expect, it } from 'vitest'
import { isNavItemActive, resolvePageTitle } from './navigation'

describe('navigation matching', () => {
  it('treats dashboard as the index route only', () => {
    expect(isNavItemActive('/', '/')).toBe(true)
    expect(isNavItemActive('/', '/patients')).toBe(false)
  })

  it('does not mark the appointment list active on the calendar', () => {
    expect(isNavItemActive('/appointments', '/appointments')).toBe(true)
    expect(isNavItemActive('/appointments', '/appointments/calendar')).toBe(false)
    expect(isNavItemActive('/appointments/calendar', '/appointments/calendar')).toBe(true)
    expect(isNavItemActive('/appointments', '/appointments/abc/edit')).toBe(true)
  })

  it('resolves page titles from the longest matching module', () => {
    expect(resolvePageTitle('/')).toBe('Dashboard')
    expect(resolvePageTitle('/patients/new')).toBe('Patients')
    expect(resolvePageTitle('/change-password')).toBe('Change password')
  })
})

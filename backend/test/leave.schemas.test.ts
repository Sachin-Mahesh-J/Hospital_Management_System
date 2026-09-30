import { describe, expect, it } from 'vitest'
import {
  createLeaveBodySchema,
  decideLeaveBodySchema,
  listLeaveQuerySchema,
  updateLeaveBodySchema,
} from '../src/modules/leave/leave.schemas.js'

describe('leave request schemas', () => {
  it('accepts optional reason and pending-period dates', () => {
    expect(
      createLeaveBodySchema.parse({
        leaveType: '  sick  ',
        startsOn: '2026-10-01',
        endsOn: '2026-10-03',
      }),
    ).toMatchObject({ leaveType: 'sick' })
  })

  it('rejects inverted ranges, unknown fields, and empty updates', () => {
    expect(() =>
      createLeaveBodySchema.parse({
        leaveType: 'sick',
        startsOn: '2026-10-03',
        endsOn: '2026-10-01',
      }),
    ).toThrow()
    expect(() =>
      createLeaveBodySchema.parse({
        leaveType: 'sick',
        startsOn: '2026-10-01',
        endsOn: '2026-10-03',
        employeeId: '11111111-1111-4111-8111-111111111111',
      }),
    ).toThrow()
    expect(() => updateLeaveBodySchema.parse({})).toThrow()
  })

  it('defaults an empty approval body', () => {
    expect(decideLeaveBodySchema.parse(undefined)).toEqual({})
    expect(
      decideLeaveBodySchema.parse({ decisionNote: '  coverage  ' }),
    ).toEqual({ decisionNote: 'coverage' })
  })

  it('accepts overlap filters', () => {
    expect(
      listLeaveQuerySchema.parse({
        status: 'approved',
        overlapsFrom: '2026-10-01',
        overlapsTo: '2026-10-07',
      }),
    ).toMatchObject({ status: 'approved' })
  })
})

import { describe, expect, it } from 'vitest'
import {
  createAttendanceBodySchema,
  listAttendanceQuerySchema,
  updateAttendanceBodySchema,
} from '../src/modules/attendance/attendance.schemas.js'

const valid = {
  employeeId: '11111111-1111-4111-8111-111111111111',
  workDate: '2026-09-28',
  status: 'present' as const,
}

describe('attendance request schemas', () => {
  it('accepts optional check-in and check-out when ordered', () => {
    expect(
      createAttendanceBodySchema.parse({
        ...valid,
        checkInAt: '2026-09-28T03:30:00.000Z',
        checkOutAt: '2026-09-28T12:00:00.000Z',
        note: '  Desk  ',
      }),
    ).toMatchObject({ note: 'Desk', status: 'present' })
  })

  it('rejects duplicate days via unknown fields and invalid status', () => {
    expect(() =>
      createAttendanceBodySchema.parse({ ...valid, overtime: true }),
    ).toThrow()
    expect(() =>
      createAttendanceBodySchema.parse({ ...valid, status: 'late' }),
    ).toThrow()
    expect(() => updateAttendanceBodySchema.parse({})).toThrow()
  })

  it('rejects checkout without check-in', () => {
    expect(() =>
      createAttendanceBodySchema.parse({
        ...valid,
        checkOutAt: '2026-09-28T12:00:00.000Z',
      }),
    ).toThrow()
  })

  it('bounds list filters', () => {
    expect(
      listAttendanceQuerySchema.parse({
        page: '2',
        status: 'absent',
        workDateFrom: '2026-09-01',
        workDateTo: '2026-09-30',
      }),
    ).toMatchObject({ page: 2, status: 'absent' })
    expect(() =>
      listAttendanceQuerySchema.parse({
        workDateFrom: '2026-09-30',
        workDateTo: '2026-09-01',
      }),
    ).toThrow()
  })
})

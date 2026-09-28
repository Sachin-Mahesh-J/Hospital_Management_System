import { describe, expect, it } from 'vitest'
import {
  createDoctorBodySchema,
  listDoctorsQuerySchema,
  updateDoctorBodySchema,
} from '../src/modules/doctors/doctor.schemas.js'
import {
  createScheduleBodySchema,
  listSchedulesQuerySchema,
  updateScheduleBodySchema,
} from '../src/modules/doctors/schedule.schemas.js'

describe('doctor request schemas', () => {
  it('trims doctor profile fields and rejects mass assignment', () => {
    expect(
      createDoctorBodySchema.parse({
        employeeId: '11111111-1111-4111-8111-111111111111',
        licenseNumber: '  LIC-1 ',
        specialization: ' Cardiology ',
      }),
    ).toMatchObject({
      licenseNumber: 'LIC-1',
      specialization: 'Cardiology',
    })
    expect(() =>
      createDoctorBodySchema.parse({
        employeeId: '11111111-1111-4111-8111-111111111111',
        licenseNumber: 'LIC-1',
        specialization: 'Cardiology',
        id: '11111111-1111-4111-8111-111111111111',
      }),
    ).toThrow()
    expect(() => updateDoctorBodySchema.parse({})).toThrow()
  })

  it('whitelists doctor list sorting and status', () => {
    expect(
      listDoctorsQuerySchema.parse({ page: '1', status: 'active' }),
    ).toMatchObject({ sortBy: 'lastName', status: 'active' })
    expect(() =>
      listDoctorsQuerySchema.parse({ sortBy: 'passwordHash' }),
    ).toThrow()
  })
})

describe('doctor schedule request schemas', () => {
  it('accepts timezone-aware intervals and rejects naive or inverted times', () => {
    expect(
      createScheduleBodySchema.parse({
        startsAt: '2026-09-28T09:00:00+05:30',
        endsAt: '2026-09-28T12:00:00+05:30',
      }),
    ).toMatchObject({
      startsAt: '2026-09-28T09:00:00+05:30',
    })
    expect(() =>
      createScheduleBodySchema.parse({
        startsAt: '2026-09-28T09:00:00',
        endsAt: '2026-09-28T12:00:00',
      }),
    ).toThrow()
    expect(() =>
      createScheduleBodySchema.parse({
        startsAt: '2026-09-28T12:00:00Z',
        endsAt: '2026-09-28T09:00:00Z',
      }),
    ).toThrow()
    expect(() =>
      updateScheduleBodySchema.parse({ status: 'closed' }),
    ).toThrow()
    expect(
      listSchedulesQuerySchema.parse({ status: 'available' }),
    ).toMatchObject({ sortBy: 'startsAt', status: 'available' })
  })
})

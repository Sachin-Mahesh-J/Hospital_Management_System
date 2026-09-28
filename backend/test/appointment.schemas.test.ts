import { describe, expect, it } from 'vitest'
import {
  cancelAppointmentBodySchema,
  createAppointmentBodySchema,
  listAppointmentsQuerySchema,
  rescheduleAppointmentBodySchema,
  updateAppointmentBodySchema,
  updateAppointmentStatusBodySchema,
} from '../src/modules/appointments/appointment.schemas.js'

describe('appointment request schemas', () => {
  it('accepts timezone-aware booking data and rejects mass assignment', () => {
    expect(
      createAppointmentBodySchema.parse({
        patientId: '11111111-1111-4111-8111-111111111111',
        doctorId: '22222222-2222-4222-8222-222222222222',
        startsAt: '2030-01-01T10:00:00Z',
        endsAt: '2030-01-01T11:00:00+00:00',
        reason: '  Review  ',
      }),
    ).toMatchObject({
      reason: 'Review',
      startsAt: '2030-01-01T10:00:00Z',
    })
    expect(() =>
      createAppointmentBodySchema.parse({
        patientId: '11111111-1111-4111-8111-111111111111',
        doctorId: '22222222-2222-4222-8222-222222222222',
        startsAt: '2030-01-01T10:00:00Z',
        endsAt: '2030-01-01T11:00:00Z',
        status: 'completed',
        createdByUserId: '11111111-1111-4111-8111-111111111111',
      }),
    ).toThrow()
  })

  it('rejects naive timestamps and inverted intervals', () => {
    expect(() =>
      createAppointmentBodySchema.parse({
        patientId: '11111111-1111-4111-8111-111111111111',
        doctorId: '22222222-2222-4222-8222-222222222222',
        startsAt: '2030-01-01T10:00:00',
        endsAt: '2030-01-01T11:00:00Z',
      }),
    ).toThrow()
    expect(() =>
      createAppointmentBodySchema.parse({
        patientId: '11111111-1111-4111-8111-111111111111',
        doctorId: '22222222-2222-4222-8222-222222222222',
        startsAt: '2030-01-01T11:00:00Z',
        endsAt: '2030-01-01T10:00:00Z',
      }),
    ).toThrow()
  })

  it('restricts ordinary updates to reason and status updates to approved values', () => {
    expect(updateAppointmentBodySchema.parse({ reason: null })).toEqual({
      reason: null,
    })
    expect(() =>
      updateAppointmentBodySchema.parse({ status: 'completed' }),
    ).toThrow()
    expect(() =>
      updateAppointmentBodySchema.parse({
        reason: 'Note',
        startsAt: '2030-01-01T10:00:00Z',
      }),
    ).toThrow()
    expect(
      updateAppointmentStatusBodySchema.parse({ status: 'checked_in' }),
    ).toEqual({ status: 'checked_in' })
    expect(() =>
      updateAppointmentStatusBodySchema.parse({ status: 'cancelled' }),
    ).toThrow()
    expect(() =>
      updateAppointmentStatusBodySchema.parse({ status: 'scheduled' }),
    ).toThrow()
  })

  it('requires a cancellation reason and same-patient reschedule payload shape', () => {
    expect(() => cancelAppointmentBodySchema.parse({})).toThrow()
    expect(() =>
      cancelAppointmentBodySchema.parse({ cancellationReason: '   ' }),
    ).toThrow()
    expect(
      cancelAppointmentBodySchema.parse({ cancellationReason: ' Patient request ' }),
    ).toEqual({ cancellationReason: 'Patient request' })
    expect(() =>
      rescheduleAppointmentBodySchema.parse({
        doctorId: '22222222-2222-4222-8222-222222222222',
        startsAt: '2030-01-01T12:00:00Z',
        endsAt: '2030-01-01T11:00:00Z',
      }),
    ).toThrow()
  })

  it('whitelists list filters and sorting', () => {
    expect(
      listAppointmentsQuerySchema.parse({
        page: '2',
        status: 'scheduled',
        startsAtFrom: '2030-01-01T00:00:00Z',
        startsAtTo: '2030-01-02T00:00:00Z',
      }),
    ).toMatchObject({
      page: 2,
      sortBy: 'startsAt',
      status: 'scheduled',
    })
    expect(() =>
      listAppointmentsQuerySchema.parse({ sortBy: 'patient_id' }),
    ).toThrow()
    expect(() =>
      listAppointmentsQuerySchema.parse({ status: 'pending' }),
    ).toThrow()
  })
})

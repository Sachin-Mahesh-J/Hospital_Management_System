import { describe, expect, it } from 'vitest'
import {
  cancelAdmissionBodySchema,
  createAdmissionBodySchema,
  dischargeAdmissionBodySchema,
  listAdmissionsQuerySchema,
  updateAdmissionBodySchema,
} from '../src/modules/admissions/admission.schemas.js'

const patientId = '11111111-1111-4111-8111-111111111111'
const doctorId = '22222222-2222-4222-8222-222222222222'

describe('admission request schemas', () => {
  it('accepts creation data and rejects client-controlled identity and lifecycle fields', () => {
    expect(
      createAdmissionBodySchema.parse({
        patientId,
        attendingDoctorId: doctorId,
        reason: '  Observation  ',
      }),
    ).toEqual({
      patientId,
      attendingDoctorId: doctorId,
      reason: 'Observation',
    })
    expect(
      createAdmissionBodySchema.parse({
        patientId,
        reason: 'Observation',
      }),
    ).toEqual({
      patientId,
      reason: 'Observation',
    })
    expect(() =>
      createAdmissionBodySchema.parse({
        patientId,
        reason: '   ',
      }),
    ).toThrow()
    expect(() =>
      createAdmissionBodySchema.parse({
        patientId,
        reason: 'Observation',
        admissionNumber: 'ADM-client',
        status: 'discharged',
        admittedAt: '2030-01-01T00:00:00.000Z',
        createdByUserId: patientId,
      }),
    ).toThrow()
  })

  it('restricts ordinary updates to attending doctor and reason', () => {
    expect(updateAdmissionBodySchema.parse({ reason: 'Updated' })).toEqual({
      reason: 'Updated',
    })
    expect(
      updateAdmissionBodySchema.parse({ attendingDoctorId: null }),
    ).toEqual({ attendingDoctorId: null })
    expect(() => updateAdmissionBodySchema.parse({})).toThrow()
    expect(() =>
      updateAdmissionBodySchema.parse({
        reason: 'Updated',
        status: 'discharged',
      }),
    ).toThrow()
    expect(() =>
      updateAdmissionBodySchema.parse({
        admissionNumber: 'ADM-x',
      }),
    ).toThrow()
  })

  it('requires a nonblank discharge summary and cancellation reason', () => {
    expect(
      dischargeAdmissionBodySchema.parse({ dischargeSummary: '  Recovered  ' }),
    ).toEqual({ dischargeSummary: 'Recovered' })
    expect(() =>
      dischargeAdmissionBodySchema.parse({ dischargeSummary: '  ' }),
    ).toThrow()
    expect(() =>
      dischargeAdmissionBodySchema.parse({
        dischargeSummary: 'Recovered',
        dischargedAt: '2030-01-01T00:00:00.000Z',
        status: 'discharged',
      }),
    ).toThrow()
    expect(cancelAdmissionBodySchema.parse({ reason: ' Duplicate  ' })).toEqual({
      reason: 'Duplicate',
    })
    expect(() => cancelAdmissionBodySchema.parse({ reason: '' })).toThrow()
    expect(() =>
      cancelAdmissionBodySchema.parse({ reason: 'Duplicate', status: 'cancelled' }),
    ).toThrow()
  })

  it('uses safe list pagination defaults', () => {
    expect(listAdmissionsQuerySchema.parse({})).toMatchObject({
      page: 1,
      pageSize: 20,
      sortBy: 'admittedAt',
      sortOrder: 'desc',
    })
    expect(() =>
      listAdmissionsQuerySchema.parse({ status: 'pending' }),
    ).toThrow()
  })
})

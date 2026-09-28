import { describe, expect, it } from 'vitest'
import {
  collectSampleBodySchema,
  createLabRequestBodySchema,
  enterLabResultBodySchema,
  listLabRequestsQuerySchema,
} from '../src/modules/laboratory/laboratory.schemas.js'

const patientId = '11111111-1111-4111-8111-111111111111'
const testDefinitionId = '22222222-2222-4222-8222-222222222222'
const doctorId = '33333333-3333-4333-8333-333333333333'
const employeeId = '44444444-4444-4444-8444-444444444444'

describe('laboratory request schemas', () => {
  it('requires at least one item and allows duplicate tests', () => {
    expect(
      createLabRequestBodySchema.parse({
        patientId,
        items: [
          { testDefinitionId },
          { testDefinitionId },
        ],
      }),
    ).toMatchObject({
      items: [{ testDefinitionId }, { testDefinitionId }],
    })
    expect(() =>
      createLabRequestBodySchema.parse({
        patientId,
        items: [],
      }),
    ).toThrow()
  })

  it('rejects client-controlled actor, status, and timestamps', () => {
    expect(() =>
      createLabRequestBodySchema.parse({
        patientId,
        requestedByDoctorId: doctorId,
        items: [{ testDefinitionId }],
      }),
    ).toThrow()
    expect(() =>
      createLabRequestBodySchema.parse({
        patientId,
        status: 'completed',
        items: [{ testDefinitionId }],
      }),
    ).toThrow()
    expect(() =>
      collectSampleBodySchema.parse({ collectedByEmployeeId: employeeId }),
    ).toThrow()
    expect(collectSampleBodySchema.parse({})).toEqual({})
    expect(() =>
      enterLabResultBodySchema.parse({
        resultValue: 'negative',
        enteredByEmployeeId: employeeId,
      }),
    ).toThrow()
    expect(
      enterLabResultBodySchema.parse({
        resultValue: 'negative',
        referenceRangeSnapshot: '  4.0-11.0  ',
      }),
    ).toEqual({
      resultValue: 'negative',
      referenceRangeSnapshot: '4.0-11.0',
    })
    expect(() =>
      enterLabResultBodySchema.parse({
        resultValue: 'negative',
        finalizedAt: '2030-01-01T00:00:00.000Z',
      }),
    ).toThrow()
  })

  it('requires a nonblank result value', () => {
    expect(() => enterLabResultBodySchema.parse({ resultValue: '   ' })).toThrow()
    expect(
      enterLabResultBodySchema.parse({
        resultValue: '  negative  ',
        resultUnit: ' mg/dL ',
      }),
    ).toEqual({
      resultValue: 'negative',
      resultUnit: 'mg/dL',
    })
  })

  it('whitelists list filters and sort fields', () => {
    expect(
      listLabRequestsQuerySchema.parse({ status: 'requested', page: '1' }),
    ).toMatchObject({ status: 'requested', sortBy: 'requestedAt' })
    expect(() =>
      listLabRequestsQuerySchema.parse({ sortBy: 'clinicalNote' }),
    ).toThrow()
  })
})

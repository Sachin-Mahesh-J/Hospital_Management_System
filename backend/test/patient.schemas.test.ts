import { describe, expect, it } from 'vitest'
import {
  createPatientBodySchema,
  listPatientsQuerySchema,
  updatePatientBodySchema,
} from '../src/modules/patients/patient.schemas.js'

const validPatient = {
  firstName: 'Fictional',
  lastName: 'Patient',
  dateOfBirth: '1995-08-17',
  dateOfBirthPrecision: 'exact',
} as const

describe('patient request schemas', () => {
  it('trims valid registration data', () => {
    expect(
      createPatientBodySchema.parse({
        ...validPatient,
        firstName: '  Fictional ',
        email: ' fictional@example.test ',
      }),
    ).toMatchObject({
      firstName: 'Fictional',
      email: 'fictional@example.test',
    })
  })

  it('rejects future and precision-inconsistent dates', () => {
    expect(() =>
      createPatientBodySchema.parse({
        ...validPatient,
        dateOfBirth: '2999-01-01',
      }),
    ).toThrow()
    expect(() =>
      createPatientBodySchema.parse({
        ...validPatient,
        dateOfBirth: '1995-08-17',
        dateOfBirthPrecision: 'month',
      }),
    ).toThrow()
    expect(
      createPatientBodySchema.parse({
        ...validPatient,
        dateOfBirth: null,
        dateOfBirthPrecision: 'unknown',
      }).dateOfBirth,
    ).toBeNull()
    expect(
      createPatientBodySchema.parse({
        ...validPatient,
        dateOfBirth: '1995-01-01',
        dateOfBirthPrecision: 'year',
      }),
    ).toMatchObject({ dateOfBirth: '1995-01-01', dateOfBirthPrecision: 'year' })
  })

  it('rejects mass assignment and empty updates', () => {
    expect(() =>
      createPatientBodySchema.parse({ ...validPatient, patientNumber: 'MANUAL' }),
    ).toThrow()
    expect(() => updatePatientBodySchema.parse({})).toThrow()
    expect(() =>
      updatePatientBodySchema.parse({ dateOfBirth: '2000-01-01' }),
    ).toThrow()
  })

  it('bounds paging and whitelists sorting and status', () => {
    expect(
      listPatientsQuerySchema.parse({ page: '2', pageSize: '20' }),
    ).toMatchObject({ page: 2, sortBy: 'lastName', sortOrder: 'asc' })
    expect(() =>
      listPatientsQuerySchema.parse({ sortBy: 'passwordHash' }),
    ).toThrow()
    expect(() =>
      listPatientsQuerySchema.parse({ status: 'deleted' }),
    ).toThrow()
    expect(() =>
      listPatientsQuerySchema.parse({ page: '10001' }),
    ).toThrow()
  })
})

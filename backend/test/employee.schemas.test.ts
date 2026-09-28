import { describe, expect, it } from 'vitest'
import {
  createEmployeeBodySchema,
  listEmployeesQuerySchema,
  updateEmployeeBodySchema,
} from '../src/modules/employees/employee.schemas.js'

const validEmployee = {
  firstName: 'Fictional',
  lastName: 'Staffmember',
  jobTitle: 'Nurse',
  departmentId: '11111111-1111-4111-8111-111111111111',
  hireDate: '2024-01-15',
} as const

describe('employee request schemas', () => {
  it('trims valid registration data', () => {
    expect(
      createEmployeeBodySchema.parse({
        ...validEmployee,
        firstName: '  Fictional ',
        email: ' staff@example.test ',
      }),
    ).toMatchObject({
      firstName: 'Fictional',
      email: 'staff@example.test',
    })
  })

  it('rejects end dates before hire dates and mass assignment', () => {
    expect(() =>
      createEmployeeBodySchema.parse({
        ...validEmployee,
        endDate: '2023-01-01',
      }),
    ).toThrow()
    expect(() =>
      createEmployeeBodySchema.parse({
        ...validEmployee,
        employeeNumber: 'MANUAL-1',
      }),
    ).toThrow()
    expect(() => updateEmployeeBodySchema.parse({})).toThrow()
  })

  it('bounds paging and whitelists sorting, status, and search filters', () => {
    expect(
      listEmployeesQuerySchema.parse({
        page: '2',
        employmentStatus: 'active',
        hasDoctorProfile: 'false',
      }),
    ).toMatchObject({
      page: 2,
      sortBy: 'lastName',
      employmentStatus: 'active',
      hasDoctorProfile: 'false',
    })
    expect(() =>
      listEmployeesQuerySchema.parse({ sortBy: 'passwordHash' }),
    ).toThrow()
    expect(() =>
      listEmployeesQuerySchema.parse({ employmentStatus: 'deleted' }),
    ).toThrow()
  })
})

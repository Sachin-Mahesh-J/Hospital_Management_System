import { describe, expect, it } from 'vitest'
import {
  createDepartmentBodySchema,
  listDepartmentsQuerySchema,
  updateDepartmentBodySchema,
} from '../src/modules/departments/department.schemas.js'

describe('department request schemas', () => {
  it('trims valid department data', () => {
    expect(
      createDepartmentBodySchema.parse({
        code: '  CARD  ',
        name: ' Cardiology ',
        description: ' Heart care ',
      }),
    ).toMatchObject({
      code: 'CARD',
      name: 'Cardiology',
      description: 'Heart care',
    })
  })

  it('rejects blank names, unknown status, and mass assignment', () => {
    expect(() =>
      createDepartmentBodySchema.parse({ code: 'CARD', name: '   ' }),
    ).toThrow()
    expect(() =>
      createDepartmentBodySchema.parse({
        code: 'CARD',
        name: 'Cardiology',
        status: 'archived',
      }),
    ).toThrow()
    expect(() =>
      createDepartmentBodySchema.parse({
        code: 'CARD',
        name: 'Cardiology',
        id: '11111111-1111-4111-8111-111111111111',
      }),
    ).toThrow()
  })

  it('rejects empty updates and unknown sort fields', () => {
    expect(() => updateDepartmentBodySchema.parse({})).toThrow()
    expect(() =>
      listDepartmentsQuerySchema.parse({ sortBy: 'passwordHash' }),
    ).toThrow()
    expect(
      listDepartmentsQuerySchema.parse({ page: '2', status: 'inactive' }),
    ).toMatchObject({ page: 2, sortBy: 'name', status: 'inactive' })
  })
})

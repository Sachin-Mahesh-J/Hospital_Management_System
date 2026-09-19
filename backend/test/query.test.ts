import { describe, expect, it } from 'vitest'
import {
  createSortingQuerySchema,
  paginationOffset,
  paginationQuerySchema,
} from '../src/api/query.js'

describe('common API query utilities', () => {
  it('parses bounded pagination and calculates the offset', () => {
    const query = paginationQuerySchema.parse({ page: '3', pageSize: '25' })

    expect(query).toEqual({ page: 3, pageSize: 25 })
    expect(paginationOffset(query)).toBe(50)
    expect(() =>
      paginationQuerySchema.parse({ page: 1, pageSize: 101 }),
    ).toThrow()
  })

  it('accepts only explicitly allowed sort fields', () => {
    const schema = createSortingQuerySchema(
      ['createdAt', 'name'] as const,
      'createdAt',
    )

    expect(schema.parse({ sortBy: 'name', sortOrder: 'desc' })).toEqual({
      sortBy: 'name',
      sortOrder: 'desc',
    })
    expect(() => schema.parse({ sortBy: 'passwordHash' })).toThrow()
  })
})

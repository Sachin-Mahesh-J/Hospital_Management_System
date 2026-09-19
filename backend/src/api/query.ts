import { z } from 'zod'

export const paginationQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict()

export type PaginationQuery = z.infer<typeof paginationQuerySchema>

export function paginationOffset(query: PaginationQuery): number {
  return (query.page - 1) * query.pageSize
}

export function createSortingQuerySchema<const TField extends string>(
  allowedFields: readonly TField[],
  defaultField: TField,
) {
  if (!allowedFields.includes(defaultField)) {
    throw new Error('The default sort field must be allowed.')
  }

  return z
    .object({
      sortBy: z
        .string()
        .refine(
          (value): value is TField =>
            allowedFields.includes(value as TField),
          'Unsupported sort field.',
        )
        .default(defaultField),
      sortOrder: z.enum(['asc', 'desc']).default('asc'),
    })
    .strict()
}

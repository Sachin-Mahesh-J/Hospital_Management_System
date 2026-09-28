import { z } from 'zod'

export const listMedicinesQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().min(1).max(200).optional(),
    sortBy: z.enum(['code', 'genericName']).default('genericName'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  })
  .strict()

export type ListMedicinesQuery = z.infer<typeof listMedicinesQuerySchema>

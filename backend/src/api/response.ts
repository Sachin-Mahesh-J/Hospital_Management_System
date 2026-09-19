import type { Response } from 'express'

export type PaginationMetadata = {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export function sendSuccess<T>(
  response: Response,
  data: T,
  status = 200,
): Response {
  return response.status(status).json({ data })
}

export function sendPaginated<T>(
  response: Response,
  data: readonly T[],
  pagination: PaginationMetadata,
): Response {
  return response.status(200).json({
    data,
    meta: { pagination },
  })
}

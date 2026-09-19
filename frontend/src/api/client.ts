import { env } from '../config/env'

type ErrorResponse = {
  error?: {
    code?: string
    message?: string
    requestId?: string
  }
}

export type HealthResponse = {
  status: 'ok'
  service: string
  timestamp: string
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string | undefined
  readonly requestId: string | undefined

  constructor(
    message: string,
    status: number,
    code?: string,
    requestId?: string,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.requestId = requestId
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${env.apiUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ErrorResponse

    throw new ApiError(
      body.error?.message ?? 'The request could not be completed.',
      response.status,
      body.error?.code,
      body.error?.requestId,
    )
  }

  return (await response.json()) as T
}

export function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>('/health')
}

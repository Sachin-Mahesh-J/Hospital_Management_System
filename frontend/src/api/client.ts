import { env } from '../config/env'

type ErrorResponse = {
  error?: {
    code?: string
    message?: string
    requestId?: string
  }
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

async function parseError(response: Response): Promise<ErrorResponse> {
  if (!response.headers.get('content-type')?.includes('application/json')) {
    return {}
  }

  return (await response.json().catch(() => ({}))) as ErrorResponse
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  try {
    const response = await fetch(`${env.apiUrl}${path}`, {
      ...init,
      headers,
    })

    if (!response.ok) {
      const body = await parseError(response)

      throw new ApiError(
        body.error?.message ?? 'The request could not be completed.',
        response.status,
        body.error?.code,
        body.error?.requestId,
      )
    }

    if (response.status === 204) {
      return undefined as T
    }

    return (await response.json()) as T
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      throw error
    }

    throw new ApiError(
      'The server could not be reached.',
      0,
      'NETWORK_ERROR',
    )
  }
}

export const apiClient = {
  get<T>(path: string, init?: RequestInit): Promise<T> {
    return request<T>(path, { ...init, method: 'GET' })
  },
  post<T>(path: string, body?: unknown, init?: RequestInit): Promise<T> {
    return request<T>(path, {
      ...init,
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  },
} as const

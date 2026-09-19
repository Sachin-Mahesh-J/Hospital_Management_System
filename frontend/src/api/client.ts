import { env } from '../config/env'

type ErrorResponse = {
  error?: {
    code?: string
    message?: string
    requestId?: string
    fields?: Array<{ path: string; message: string }>
  }
}

type ApiResponse<T> = {
  data: T
}

type RefreshResponse = {
  accessToken: string
}

type RequestOptions = {
  canRefresh?: boolean
  hasRetried?: boolean
}

const loginPath = '/auth/login'
const refreshPath = '/auth/refresh'

let accessToken: string | null = null
let refreshRequest: Promise<string> | null = null
let expirationHandler: (() => void) | null = null

export class ApiError extends Error {
  readonly status: number
  readonly code: string | undefined
  readonly requestId: string | undefined
  readonly fields: ReadonlyArray<{ path: string; message: string }>

  constructor(
    message: string,
    status: number,
    code?: string,
    requestId?: string,
    fields: ReadonlyArray<{ path: string; message: string }> = [],
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.requestId = requestId
    this.fields = fields
  }
}

async function parseError(response: Response): Promise<ErrorResponse> {
  if (!response.headers.get('content-type')?.includes('application/json')) {
    return {}
  }

  return (await response.json().catch(() => ({}))) as ErrorResponse
}

function createHeaders(path: string, init: RequestInit): Headers {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }
  if (init.method === 'POST' && path.startsWith('/auth/')) {
    headers.set('X-HMS-CSRF', '1')
  }
  return headers
}

async function execute<T>(
  path: string,
  init: RequestInit,
): Promise<{ response: Response; body?: ApiResponse<T> & Record<string, unknown> }> {
  const headers = createHeaders(path, init)

  const response = await fetch(`${env.apiUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers,
  })

  if (response.status === 204) {
    return { response }
  }

  if (!response.ok) {
    return { response }
  }

  const body = (await response.json()) as ApiResponse<T> & Record<string, unknown>
  return { response, body }
}

async function throwResponseError(response: Response): Promise<never> {
  const body = await parseError(response)
  throw new ApiError(
    body.error?.message ?? 'The request could not be completed.',
    response.status,
    body.error?.code,
    body.error?.requestId,
    body.error?.fields,
  )
}

function refreshAccessToken(): Promise<string> {
  if (!refreshRequest) {
    refreshRequest = request<RefreshResponse>(
      refreshPath,
      { method: 'POST' },
      { canRefresh: false },
    )
      .then(({ accessToken: refreshedToken }) => {
        accessToken = refreshedToken
        return refreshedToken
      })
      .catch((error: unknown) => {
        accessToken = null
        expirationHandler?.()
        throw error
      })
      .finally(() => {
        refreshRequest = null
      })
  }

  return refreshRequest
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  options: RequestOptions = {},
  select: (body: ApiResponse<unknown> & Record<string, unknown>) => T =
    (body) => body.data as T,
): Promise<T> {
  try {
    const { response, body } = await execute<unknown>(path, init)

    if (!response.ok) {
      const canRefresh = options.canRefresh
        ?? (
          accessToken !== null
          && path !== loginPath
          && path !== refreshPath
        )

      if (response.status === 401 && canRefresh && !options.hasRetried) {
        try {
          await refreshAccessToken()
        } catch {
          return throwResponseError(response)
        }

        return request<T>(
          path,
          init,
          { canRefresh: false, hasRetried: true },
          select,
        )
      }

      return throwResponseError(response)
    }

    return select(body!)
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

export function setAccessToken(token: string | null): void {
  accessToken = token
}

export function setAuthExpirationHandler(handler: (() => void) | null): void {
  expirationHandler = handler
}

export function refreshSession(): Promise<string> {
  return refreshAccessToken()
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
  patch<T>(path: string, body: unknown, init?: RequestInit): Promise<T> {
    return request<T>(path, {
      ...init,
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  },
  getEnvelope<T>(
    path: string,
    init?: RequestInit,
  ): Promise<ApiResponse<T> & Record<string, unknown>> {
    return request(
      path,
      { ...init, method: 'GET' },
      {},
      (body) => body as ApiResponse<T> & Record<string, unknown>,
    )
  },
} as const

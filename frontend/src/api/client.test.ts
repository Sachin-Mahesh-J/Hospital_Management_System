import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ApiError,
  apiClient,
  setAccessToken,
  setAuthExpirationHandler,
} from './client'

describe('API client', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    setAccessToken(null)
    setAuthExpirationHandler(null)
  })

  it('uses credentials and unwraps successful API responses', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ data: { status: 'ok' } }), {
        headers: { 'content-type': 'application/json' },
        status: 200,
      }),
    )

    await expect(apiClient.get<{ status: string }>('/health')).resolves.toEqual({
      status: 'ok',
    })
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:5000/api/v1/health',
      expect.objectContaining({
        credentials: 'include',
        method: 'GET',
      }),
    )
  })

  it('adds the CSRF marker to authentication POST requests', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ data: { accessToken: 'token' } }), {
        headers: { 'content-type': 'application/json' },
        status: 200,
      }),
    )

    await apiClient.post('/auth/login', {
      username: 'admin',
      password: 'secret',
    })

    const init = vi.mocked(fetch).mock.calls[0]?.[1]
    expect(new Headers(init?.headers).get('X-HMS-CSRF')).toBe('1')
  })

  it('maps safe API errors and request IDs', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request.',
            requestId: 'request-123',
          },
        }),
        {
          headers: { 'content-type': 'application/json' },
          status: 400,
        },
      ),
    )

    const error = await apiClient.get('/invalid').catch((caught) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      requestId: 'request-123',
    })
  })

  it('returns a consistent network error', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('network details'))

    await expect(apiClient.get('/health')).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'The server could not be reached.',
    })
  })

  it('uses one refresh for concurrent 401 responses and retries once', async () => {
    setAccessToken('expired-token')
    let protectedCalls = 0
    let refreshCalls = 0
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input)
      if (url.endsWith('/auth/refresh')) {
        refreshCalls += 1
        return new Response(
          JSON.stringify({ data: { accessToken: 'refreshed-token' } }),
          { headers: { 'content-type': 'application/json' }, status: 200 },
        )
      }

      protectedCalls += 1
      if (protectedCalls <= 2) {
        return new Response(null, { status: 401 })
      }

      return new Response(JSON.stringify({ data: { ok: true } }), {
        headers: { 'content-type': 'application/json' },
        status: 200,
      })
    })

    await expect(
      Promise.all([
        apiClient.get('/auth/me'),
        apiClient.get('/auth/me'),
      ]),
    ).resolves.toEqual([{ ok: true }, { ok: true }])
    expect(refreshCalls).toBe(1)

    const retryHeaders = vi.mocked(fetch).mock.calls
      .filter(([url]) => String(url).endsWith('/auth/me'))
      .slice(-2)
      .map(([, init]) => new Headers(init?.headers))
    expect(retryHeaders.every(
      (headers) => headers.get('Authorization') === 'Bearer refreshed-token',
    )).toBe(true)
  })

  it('does not refresh login and signals terminal expiration on refresh failure', async () => {
    const onExpiration = vi.fn()
    setAuthExpirationHandler(onExpiration)
    vi.mocked(fetch).mockResolvedValue(
      new Response(null, { status: 401 }),
    )

    await expect(apiClient.post('/auth/login', {})).rejects.toMatchObject({
      status: 401,
    })
    expect(fetch).toHaveBeenCalledTimes(1)

    setAccessToken('expired-token')
    await expect(apiClient.get('/auth/me')).rejects.toMatchObject({
      status: 401,
    })
    expect(fetch).toHaveBeenCalledTimes(3)
    expect(onExpiration).toHaveBeenCalledOnce()
  })
})

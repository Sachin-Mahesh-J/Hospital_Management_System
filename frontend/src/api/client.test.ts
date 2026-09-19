import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiClient } from './client'

describe('API client', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('uses the configured base URL and parses successful responses', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok' }), {
        headers: { 'content-type': 'application/json' },
        status: 200,
      }),
    )

    await expect(apiClient.get<{ status: string }>('/health')).resolves.toEqual({
      status: 'ok',
    })
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:5000/api/v1/health',
      expect.objectContaining({ method: 'GET' }),
    )
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
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { config } from '@/config'
import { ApiError } from './api-error'
import { NETWORK_ERROR_MESSAGE, request } from './http'

const fetchMock = vi.fn<typeof fetch>()

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
})

describe('request', () => {
  it('returns the parsed body of a successful response', async () => {
    fetchMock.mockResolvedValue(jsonResponse([{ id: '1', title: 'Buy milk', status: 'pending' }]))

    const data = await request('/tasks')

    expect(data).toEqual([{ id: '1', title: 'Buy milk', status: 'pending' }])
    expect(fetchMock).toHaveBeenCalledWith(
      `${config.apiBaseUrl}/tasks`,
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('sends a JSON body with the right method and content type', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ id: '1', title: 'Buy milk', status: 'pending' }, 201),
    )

    await request('/tasks', { method: 'POST', body: { title: 'Buy milk' } })

    expect(fetchMock).toHaveBeenCalledWith(`${config.apiBaseUrl}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Buy milk' }),
    })
  })

  it('turns the backend error shape into an ApiError', async () => {
    const details = [{ field: 'title', message: 'Title must not be empty' }]
    fetchMock.mockResolvedValue(
      jsonResponse(
        { error: { code: 'VALIDATION_ERROR', message: 'Request validation failed', details } },
        400,
      ),
    )

    const error = await request('/tasks').catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      code: 'VALIDATION_ERROR',
      status: 400,
      message: 'Request validation failed',
      details,
    })
  })

  it('reports an error body that is not in the backend shape as an unexpected response', async () => {
    fetchMock.mockResolvedValue(new Response('<html>Bad gateway</html>', { status: 502 }))

    const error = await request('/tasks').catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ code: 'UNEXPECTED_RESPONSE', status: 502 })
  })

  it('turns a network failure into an ApiError with a user-facing message', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    const error = await request('/tasks').catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      code: 'NETWORK_ERROR',
      status: null,
      message: NETWORK_ERROR_MESSAGE,
    })
  })
})

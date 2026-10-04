import { config } from '@/config'
import { SERVER_ERROR_CODES, type ApiErrorResponse, type ServerErrorCode } from '@/types/api'
import { ApiError } from './api-error'

export const NETWORK_ERROR_MESSAGE =
  'Could not reach the server. Check your connection and try again.'
const UNEXPECTED_RESPONSE_MESSAGE = 'The server sent an unexpected response. Try again in a moment.'

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH'
  body?: unknown
}

function isServerErrorCode(value: unknown): value is ServerErrorCode {
  return SERVER_ERROR_CODES.some((code) => code === value)
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (typeof value !== 'object' || value === null || !('error' in value)) {
    return false
  }
  const { error } = value
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    isServerErrorCode(error.code) &&
    'message' in error &&
    typeof error.message === 'string' &&
    (!('details' in error) || Array.isArray(error.details))
  )
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return undefined
  }
}

async function toApiError(response: Response): Promise<ApiError> {
  const body = await readJson(response)
  if (isApiErrorResponse(body)) {
    return new ApiError(body.error.code, body.error.message, {
      status: response.status,
      details: body.error.details ?? [],
    })
  }
  return new ApiError('UNEXPECTED_RESPONSE', UNEXPECTED_RESPONSE_MESSAGE, {
    status: response.status,
  })
}

// The only place in the app that calls fetch.
export async function request<T>(
  path: string,
  { method = 'GET', body }: RequestOptions = {},
): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${config.apiBaseUrl}${path}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError('NETWORK_ERROR', NETWORK_ERROR_MESSAGE)
  }

  if (!response.ok) {
    throw await toApiError(response)
  }

  const data = await readJson(response)
  if (data === undefined) {
    throw new ApiError('UNEXPECTED_RESPONSE', UNEXPECTED_RESPONSE_MESSAGE, {
      status: response.status,
    })
  }
  // The backend owns the response shapes, so a successful body is trusted rather than re-validated.
  return data as T
}

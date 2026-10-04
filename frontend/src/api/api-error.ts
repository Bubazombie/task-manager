import type { FieldError, ServerErrorCode } from '@/types/api'

// Codes the client produces itself, when there is no usable error body from the server.
export type ClientErrorCode = 'NETWORK_ERROR' | 'UNEXPECTED_RESPONSE'
export type ApiErrorCode = ServerErrorCode | ClientErrorCode

interface ApiErrorOptions {
  status?: number | null
  details?: FieldError[]
}

export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly status: number | null
  readonly details: FieldError[]

  constructor(
    code: ApiErrorCode,
    message: string,
    { status = null, details = [] }: ApiErrorOptions = {},
  ) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.details = details
  }
}

/*
 * Server messages are written for developers (they can contain ids), so the UI shows its own
 * message for each action. Network errors are the exception: their message tells the user what to do.
 */
export function getUserMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError && error.code === 'NETWORK_ERROR' ? error.message : fallback
}

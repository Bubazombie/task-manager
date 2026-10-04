// Mirrors the backend error shape in backend/src/errors/error-handler.ts.
export const SERVER_ERROR_CODES = [
  'VALIDATION_ERROR',
  'INVALID_JSON',
  'PAYLOAD_TOO_LARGE',
  'NOT_FOUND',
  'INTERNAL_ERROR',
] as const

export type ServerErrorCode = (typeof SERVER_ERROR_CODES)[number]

export interface FieldError {
  field: string
  message: string
}

export interface ApiErrorResponse {
  error: {
    code: ServerErrorCode
    message: string
    details?: FieldError[]
  }
}

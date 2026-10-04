import type { NextFunction, Request, Response } from 'express'
import { z } from 'zod'
import { NotFoundError } from './not-found-error.js'

const BODY_FIELD = 'body'
const UNKNOWN_FIELD_MESSAGE = 'Unknown field'
const INTERNAL_ERROR_MESSAGE = 'Something went wrong. Please try again later.'

type ErrorCode =
  'VALIDATION_ERROR' | 'INVALID_JSON' | 'PAYLOAD_TOO_LARGE' | 'NOT_FOUND' | 'INTERNAL_ERROR'

interface FieldError {
  field: string
  message: string
}

export interface ErrorResponse {
  error: {
    code: ErrorCode
    message: string
    details?: FieldError[]
  }
}

function sendError(
  res: Response,
  status: number,
  code: ErrorCode,
  message: string,
  details?: FieldError[],
): void {
  const body: ErrorResponse = { error: { code, message, ...(details && { details }) } }
  res.status(status).json(body)
}

function toFieldErrors(error: z.ZodError): FieldError[] {
  return error.issues.flatMap((issue) => {
    // Zod reports all unknown keys in one issue; one entry per key is easier for clients.
    if (issue.code === 'unrecognized_keys') {
      return issue.keys.map((key) => ({ field: key, message: UNKNOWN_FIELD_MESSAGE }))
    }
    const field = issue.path.map(String).join('.') || BODY_FIELD
    return [{ field, message: issue.message }]
  })
}

// body-parser tags its errors with a string `type`, such as 'entity.parse.failed'.
function getBodyParserErrorType(error: unknown): string | undefined {
  if (error instanceof Error && 'type' in error && typeof error.type === 'string') {
    return error.type
  }
  return undefined
}

// Express recognizes error-handling middleware by its four parameters.
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(error)
    return
  }

  if (error instanceof z.ZodError) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Request validation failed', toFieldErrors(error))
    return
  }

  const bodyParserErrorType = getBodyParserErrorType(error)
  if (bodyParserErrorType === 'entity.parse.failed') {
    sendError(res, 400, 'INVALID_JSON', 'Request body is not valid JSON')
    return
  }
  if (bodyParserErrorType === 'entity.too.large') {
    sendError(res, 413, 'PAYLOAD_TOO_LARGE', 'Request body is too large')
    return
  }

  if (error instanceof NotFoundError) {
    sendError(res, 404, 'NOT_FOUND', error.message)
    return
  }

  console.error(error)
  sendError(res, 500, 'INTERNAL_ERROR', INTERNAL_ERROR_MESSAGE)
}

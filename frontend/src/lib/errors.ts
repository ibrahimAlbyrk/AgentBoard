/**
 * Structured error handling utilities for API errors.
 *
 * The backend returns errors in this shape:
 * {
 *   success: false,
 *   error: {
 *     code: "VALIDATION_ERROR" | "NOT_FOUND" | "DUPLICATE" | ...,
 *     message: "Human-readable message",
 *     details?: [{ field: "title", message: "Title is required" }]
 *   }
 * }
 */

export interface FieldError {
  field: string
  message: string
}

export interface ParsedError {
  message: string
  code: string
  details?: FieldError[]
}

const FALLBACK_MESSAGES: Record<string, string> = {
  VALIDATION_ERROR: 'Please check your input and try again',
  NOT_FOUND: 'The requested resource was not found',
  DUPLICATE: 'This resource already exists',
  PERMISSION_DENIED: "You don't have permission to perform this action",
  LIMIT_EXCEEDED: 'Limit reached',
  INVALID_OPERATION: 'This operation is not allowed',
  AUTH_FAILED: 'Authentication failed',
  UNAUTHORIZED: 'Please sign in to continue',
  RATE_LIMIT: 'Too many requests. Please wait a moment.',
  INTERNAL_ERROR: 'An unexpected error occurred. Please try again.',
}

/**
 * Extract a structured error from whatever the API client throws.
 * Handles the backend's { success, error: { code, message, details } } shape,
 * plain Error objects, and unknown values.
 */
export function parseApiError(err: unknown): ParsedError {
  // Backend structured error (thrown by api-client.ts)
  if (err && typeof err === 'object' && 'error' in err) {
    const apiErr = (err as Record<string, unknown>).error as Record<string, unknown> | undefined
    if (apiErr && typeof apiErr === 'object') {
      const code = (apiErr.code as string) || 'UNKNOWN'
      const message = (apiErr.message as string) || FALLBACK_MESSAGES[code] || 'Something went wrong'
      const details = Array.isArray(apiErr.details)
        ? (apiErr.details as FieldError[])
        : undefined
      return { message, code, details }
    }
  }

  // Error with a "detail" field (some FastAPI error shapes)
  if (err && typeof err === 'object' && 'detail' in err) {
    const detail = (err as Record<string, unknown>).detail
    if (typeof detail === 'string') {
      return { message: detail, code: 'UNKNOWN' }
    }
  }

  // Plain Error instance
  if (err instanceof Error) {
    return { message: err.message, code: 'UNKNOWN' }
  }

  // String
  if (typeof err === 'string') {
    return { message: err, code: 'UNKNOWN' }
  }

  return { message: 'Something went wrong', code: 'UNKNOWN' }
}

/**
 * Get a user-friendly error message from any thrown value.
 * Shorthand for parseApiError(err).message.
 */
export function getErrorMessage(err: unknown): string {
  return parseApiError(err).message
}

/**
 * Check whether an error indicates a network/connectivity issue.
 */
export function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError && err.message === 'Failed to fetch') return true
  if (err instanceof DOMException && err.name === 'AbortError') return true
  return false
}

/**
 * Get error message with network-aware fallback.
 */
export function getErrorMessageWithNetwork(err: unknown): string {
  if (isNetworkError(err)) {
    return 'Unable to connect to server. Check your internet connection.'
  }
  return getErrorMessage(err)
}

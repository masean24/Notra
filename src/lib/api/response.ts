import { NextResponse } from "next/server"

export interface ApiError {
  code: string
  message: string
}

export type ApiSuccess<T> = { success: true; data: T }
export type ApiFailure = { success: false; error: ApiError }
export type ApiResult<T> = ApiSuccess<T> | ApiFailure

export function successResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ success: true, data } satisfies ApiSuccess<T>, {
    status,
  })
}

export function errorResponse(
  status: number,
  code: string,
  message: string
): NextResponse {
  return NextResponse.json(
    { success: false, error: { code, message } } satisfies ApiFailure,
    { status }
  )
}

/**
 * Maps a SECURITY DEFINER RPC error message to a safe API error. Anything
 * unexpected collapses into a generic server error so internal details never
 * leak to clients.
 */
export function mapRpcError(error: unknown): NextResponse {
  const raw =
    error instanceof Error ? error.message : String(error ?? "UNKNOWN")
  // Supabase wraps Postgres exceptions as e.g. "NOTE_NOT_FOUND".
  const code = raw.split("\n")[0].trim()

  switch (code) {
    case "NOTE_NOT_FOUND":
      // Same shape as a missing note: private notes are indistinguishable.
      return errorResponse(404, "NOT_FOUND", "Note not found.")
    case "REVISION_NOT_FOUND":
      return errorResponse(404, "NOT_FOUND", "Revision not found.")
    case "INVALID_SHARE_PERMISSION":
    case "INVALID_SHARE_EXPIRY":
      return errorResponse(400, code, "The share link request is invalid.")
    case "NOTE_EXPIRED":
      return errorResponse(410, "NOTE_EXPIRED", "This note has expired.")
    case "NOTE_READ_ONLY":
      return errorResponse(
        403,
        "NOTE_READ_ONLY",
        "This note is permanently read-only."
      )
    case "EDIT_SESSION_REQUIRED":
    case "EDIT_SESSION_EXPIRED":
      return errorResponse(
        401,
        "EDIT_SESSION_EXPIRED",
        "Your editing session has expired. Re-enter the edit code to continue."
      )
    case "INVALID_EDIT_CODE":
      return errorResponse(401, "INVALID_EDIT_CODE", "Invalid edit code.")
    case "EDIT_LOCKED":
      return errorResponse(
        423,
        "EDIT_LOCKED",
        "Too many failed attempts. Try again in 15 minutes."
      )
    case "INVALID_EDIT_CODE_FORMAT":
    case "INVALID_EDITING_POLICY":
    case "INVALID_VISIBILITY":
    case "INVALID_CONTENT_FORMAT":
    case "NOTE_TOO_LARGE":
    case "TITLE_TOO_LONG":
      return errorResponse(400, code, "The note payload is invalid.")
    case "RATE_LIMITED":
      return errorResponse(
        429,
        "RATE_LIMITED",
        "Too many requests. Please slow down and try again later."
      )
    default:
      return errorResponse(
        500,
        "INTERNAL_ERROR",
        "Something went wrong. Please try again."
      )
  }
}

import { type NextRequest } from "next/server"

import { errorResponse, successResponse } from "@/lib/api/response"
import {
  EDIT_SESSION_TTL_SECONDS,
  editSessionCookieName,
  issueEditSession,
} from "@/lib/notes/sessions"
import { consumeRateLimit, getClientIp, hashIp } from "@/lib/rate-limit"
import { assertCsrf } from "@/lib/security/csrf"
import { createClient } from "@/lib/supabase/server"
import { verifyEditSchema } from "@/lib/validation/notes"

const MAX_VERIFY_ATTEMPTS_PER_WINDOW = 10
const VERIFY_WINDOW_SECONDS = 15 * 60

/**
 * Verifies an edit code and issues a short-lived edit session
 * (HttpOnly, SameSite=Lax, 30 min). Brute force is countered by the per-note
 * lockout inside `verify_edit_code` plus this per-IP durable rate limit.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  const csrfFailure = assertCsrf(request)
  if (csrfFailure) {
    return csrfFailure
  }

  const { publicId } = await params
  const supabase = await createClient()

  const ip = getClientIp(request)
  const ipHash = hashIp(ip)
  const allowed = await consumeRateLimit(
    supabase,
    `verify_edit:${ipHash}`,
    MAX_VERIFY_ATTEMPTS_PER_WINDOW,
    VERIFY_WINDOW_SECONDS
  )
  if (!allowed) {
    return errorResponse(
      429,
      "RATE_LIMITED",
      "Too many unlock attempts. Please try again later."
    )
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be JSON.")
  }
  const parsed = verifyEditSchema.safeParse(payload)
  if (!parsed.success) {
    return errorResponse(
      400,
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid request."
    )
  }

  const result = await issueEditSession(
    supabase,
    publicId,
    parsed.data.code,
    ipHash
  )

  if (result.status === "note_not_found") {
    return errorResponse(404, "NOT_FOUND", "Note not found.")
  }
  if (result.status === "invalid_code") {
    return errorResponse(401, "INVALID_EDIT_CODE", "Invalid edit code.")
  }
  if (result.status === "locked") {
    return errorResponse(
      423,
      "EDIT_LOCKED",
      "Too many failed attempts. Try again in 15 minutes."
    )
  }
  if (result.status !== "ok") {
    return errorResponse(
      500,
      "INTERNAL_ERROR",
      "Could not verify the code. Please try again."
    )
  }

  const response = successResponse({
    issued: true,
    expiresAt: result.expiresAt,
  })
  response.cookies.set({
    name: editSessionCookieName(publicId),
    value: result.token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: EDIT_SESSION_TTL_SECONDS,
  })
  return response
}

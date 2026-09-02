import { type NextRequest } from "next/server"

import { errorResponse, successResponse } from "@/lib/api/response"
import { consumeRateLimit, getClientIp, hashIp } from "@/lib/rate-limit"
import { assertCsrf } from "@/lib/security/csrf"
import { createClient } from "@/lib/supabase/server"
import { claimNoteSchema } from "@/lib/validation/notes"

const MAX_CLAIM_ATTEMPTS_PER_WINDOW = 10
const CLAIM_WINDOW_SECONDS = 15 * 60

interface ClaimRpcPayload {
  status: "ok" | "invalid_code" | "locked" | "note_not_found" | "already_claimed" | "unauthenticated"
  public_id?: string
}

/**
 * Claims a guest note for the signed-in user via the SECURITY DEFINER
 * `claim_note` RPC: the edit code is verified inside Postgres (bcrypt) and
 * ownership is reassigned. The per-user lockout lives inside the RPC; this
 * route adds the per-IP durable rate limit on top.
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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return errorResponse(
      401,
      "UNAUTHENTICATED",
      "Sign in to claim a guest note."
    )
  }

  const allowed = await consumeRateLimit(
    supabase,
    `claim:${hashIp(getClientIp(request))}`,
    MAX_CLAIM_ATTEMPTS_PER_WINDOW,
    CLAIM_WINDOW_SECONDS
  )
  if (!allowed) {
    return errorResponse(
      429,
      "RATE_LIMITED",
      "Too many claim attempts. Please try again later."
    )
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be JSON.")
  }
  const parsed = claimNoteSchema.safeParse(payload)
  if (!parsed.success) {
    return errorResponse(
      400,
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid request."
    )
  }

  const { data, error } = await supabase.rpc("claim_note", {
    p_public_id: publicId,
    p_code: parsed.data.code,
  })
  if (error) {
    console.error("claim_note failed:", error.message)
    return errorResponse(
      500,
      "INTERNAL_ERROR",
      "Could not claim the note. Please try again."
    )
  }

  const result = data as ClaimRpcPayload
  switch (result?.status) {
    case "ok":
      return successResponse({
        claimed: true,
        publicId: result.public_id ?? publicId,
      })
    case "note_not_found":
      return errorResponse(404, "NOT_FOUND", "Note not found.")
    case "already_claimed":
      return errorResponse(
        409,
        "NOTE_ALREADY_CLAIMED",
        "This note is already owned by an account."
      )
    case "invalid_code":
      return errorResponse(401, "INVALID_EDIT_CODE", "Invalid edit code.")
    case "locked":
      return errorResponse(
        423,
        "EDIT_LOCKED",
        "Too many failed attempts. Try again in 15 minutes."
      )
    default:
      return errorResponse(
        500,
        "INTERNAL_ERROR",
        "Could not claim the note. Please try again."
      )
  }
}

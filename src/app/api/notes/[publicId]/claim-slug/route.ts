import { type NextRequest } from "next/server"

import { errorResponse, successResponse } from "@/lib/api/response"
import { consumeRateLimit, getClientIp, hashIp } from "@/lib/rate-limit"
import { assertCsrf } from "@/lib/security/csrf"
import { createClient } from "@/lib/supabase/server"
import { claimSlugSchema } from "@/lib/validation/notes"

interface ClaimSlugPayload {
  status: "ok" | "invalid_slug" | "reserved_slug" | "slug_taken" | "note_not_found"
  slug?: string
}

/**
 * Claims a vanity slug for a note the caller owns via the SECURITY DEFINER
 * `claim_slug` RPC — reserved-list validation and race-proof uniqueness are
 * enforced inside Postgres against the unique index on custom_slug.
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
    return errorResponse(401, "UNAUTHENTICATED", "Sign in to manage notes.")
  }

  const allowed = await consumeRateLimit(
    supabase,
    `claim_slug:${hashIp(getClientIp(request))}`,
    10,
    60 * 60
  )
  if (!allowed) {
    return errorResponse(
      429,
      "RATE_LIMITED",
      "Too many slug attempts. Please try again later."
    )
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be JSON.")
  }
  const parsed = claimSlugSchema.safeParse(payload)
  if (!parsed.success) {
    return errorResponse(
      400,
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid request."
    )
  }

  const { data, error } = await supabase.rpc("claim_slug", {
    p_public_id: publicId,
    p_slug: parsed.data.slug,
  })
  if (error) {
    console.error("claim_slug failed:", error.message)
    return errorResponse(
      500,
      "INTERNAL_ERROR",
      "Could not claim the slug. Please try again."
    )
  }

  const result = data as ClaimSlugPayload
  switch (result?.status) {
    case "ok":
      return successResponse({ claimed: true, slug: result.slug })
    case "note_not_found":
      return errorResponse(404, "NOT_FOUND", "Note not found.")
    case "invalid_slug":
      return errorResponse(
        400,
        "INVALID_SLUG",
        "Use 3–63 lowercase letters, digits, or hyphens (no leading/trailing hyphen)."
      )
    case "reserved_slug":
      return errorResponse(
        409,
        "SLUG_RESERVED",
        "That slug is reserved by the system and cannot be claimed."
      )
    case "slug_taken":
      return errorResponse(
        409,
        "SLUG_TAKEN",
        "That slug is already taken. Try another one."
      )
    default:
      return errorResponse(
        500,
        "INTERNAL_ERROR",
        "Could not claim the slug. Please try again."
      )
  }
}

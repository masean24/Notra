import { NextResponse, type NextRequest } from "next/server"

import { errorResponse, mapRpcError, successResponse } from "@/lib/api/response"
import { issueEditSession } from "@/lib/notes/sessions"
import { consumeRateLimit, getClientIp, hashIp } from "@/lib/rate-limit"
import { assertCsrf } from "@/lib/security/csrf"
import { createClient } from "@/lib/supabase/server"
import { createNoteSchema } from "@/lib/validation/notes"

/**
 * Creates a guest note via the SECURITY DEFINER `create_guest_note` RPC.
 * When the caller supplies an edit code (edit_code policy), the same request
 * also mints an edit session — the caller has just demonstrated knowledge of
 * the code — and sets the HttpOnly session cookie.
 */
export async function POST(request: NextRequest) {
  const csrfFailure = assertCsrf(request)
  if (csrfFailure) {
    return csrfFailure
  }

  const supabase = await createClient()

  const ip = getClientIp(request)
  const allowed = await consumeRateLimit(
    supabase,
    `create_note:${hashIp(ip)}`,
    20,
    60 * 60
  )
  if (!allowed) {
    return errorResponse(
      429,
      "RATE_LIMITED",
      "Too many notes created. Please try again later."
    )
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be JSON.")
  }

  const parsed = createNoteSchema.safeParse(payload)
  if (!parsed.success) {
    return errorResponse(
      400,
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid request."
    )
  }
  const input = parsed.data

  // Signed-in callers create an owned note (editing only via the account, no
  // edit code — authorization is owner_id + RLS). Guests keep the edit-code
  // flow below.
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: ownedPublicId, error: ownedError } = await supabase.rpc(
      "create_user_note",
      {
        p_title: input.title,
        p_content: input.content ?? null,
        p_content_format: input.contentFormat,
        p_expires_at: input.expiresAt ?? null,
        p_visibility: input.visibility,
      }
    )
    if (ownedError) {
      return mapRpcError(ownedError)
    }
    return successResponse(
      { publicId: ownedPublicId as string, sessionIssued: false },
      201
    )
  }

  const { data: publicId, error } = await supabase.rpc("create_guest_note", {
    p_title: input.title,
    p_content: input.content ?? null,
    p_content_format: input.contentFormat,
    p_editing_policy: input.editingPolicy,
    p_edit_code: input.editCode ?? null,
    p_expires_at: input.expiresAt ?? null,
    p_visibility: input.visibility,
  })
  if (error) {
    return mapRpcError(error)
  }

  // Mint the creator's edit session in the same response for edit-code notes:
  // the caller has just demonstrated knowledge of the code by submitting it.
  let sessionIssued = false
  let sessionToken: string | null = null
  let sessionExpiresAt: string | null = null

  if (input.editCode !== undefined) {
    const issued = await issueEditSession(
      supabase,
      publicId as string,
      input.editCode,
      hashIp(ip)
    )
    if (issued.status === "ok") {
      sessionIssued = true
      sessionToken = issued.token
      sessionExpiresAt = issued.expiresAt
    }
    // A failed session mint is non-fatal: the creator can still unlock with
    // their code on the note page.
  }

  const response = successResponse(
    {
      publicId: publicId as string,
      sessionIssued,
    },
    201
  )

  if (sessionIssued && sessionToken && sessionExpiresAt) {
    const maxAge = Math.max(
      0,
      Math.floor(
        (new Date(sessionExpiresAt).getTime() - Date.now()) / 1000
      )
    )
    response.cookies.set({
      name: `on_edit_${publicId as string}`,
      value: sessionToken,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge,
    })
  }
  return response as NextResponse
}

import { type NextRequest } from "next/server"

import { errorResponse, successResponse } from "@/lib/api/response"
import { assertCsrf } from "@/lib/security/csrf"
import { createClient } from "@/lib/supabase/server"
import { updateNoteSchema } from "@/lib/validation/notes"

interface PublicNotePayload {
  status: "ok" | "expired" | "not_found"
  expires_at?: string
  public_id?: string
  title?: string
  content?: unknown
  content_format?: string
  created_at?: string
  updated_at?: string
}

/**
 * Public note retrieval via the `get_public_note` SECURITY DEFINER RPC.
 * Private, soft-deleted, and missing notes return the same NOT_FOUND
 * response — no existence oracle. Expired public notes return 410 so the UI
 * can show a real expiration page (SPEC §9/§21).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  const { publicId } = await params
  const supabase = await createClient()

  const { data, error } = await supabase.rpc("get_public_note", {
    p_public_id: publicId,
  })
  if (error) {
    return errorResponse(
      500,
      "INTERNAL_ERROR",
      "Could not load the note. Please try again."
    )
  }

  const payload = data as PublicNotePayload
  if (payload?.status === "expired") {
    return errorResponse(410, "NOTE_EXPIRED", "This note has expired.")
  }
  if (payload?.status !== "ok") {
    return errorResponse(404, "NOT_FOUND", "Note not found.")
  }

  return successResponse({
    public_id: payload.public_id,
    title: payload.title,
    content: payload.content,
    content_format: payload.content_format,
    created_at: payload.created_at,
    updated_at: payload.updated_at,
  })
}

/**
 * Owner-only metadata update (title, favorite, visibility). Authorization is
 * enforced by RLS (`notes_update_own`) plus an explicit owner_id filter; a
 * missing note and a note owned by someone else are both NOT_FOUND.
 */
export async function PATCH(
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

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be JSON.")
  }
  const parsed = updateNoteSchema.safeParse(payload)
  if (!parsed.success) {
    return errorResponse(
      400,
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid request."
    )
  }

  const { data: updated, error } = await supabase
    .from("notes")
    .update(parsed.data)
    .eq("public_id", publicId)
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .select("public_id")
    .maybeSingle()

  if (error) {
    return errorResponse(
      500,
      "INTERNAL_ERROR",
      "Could not update the note. Please try again."
    )
  }
  if (!updated) {
    return errorResponse(404, "NOT_FOUND", "Note not found.")
  }
  return successResponse({ updated: true })
}

/**
 * Deletes a note owned by the caller. Default is a soft delete (deleted_at
 * set, restorable from the dashboard trash); `?permanent=true` removes the
 * note and all its revisions/sessions for good. Owner-only via RLS.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  const csrfFailure = assertCsrf(request)
  if (csrfFailure) {
    return csrfFailure
  }

  const { publicId } = await params
  const permanent =
    request.nextUrl.searchParams.get("permanent") === "true"
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return errorResponse(401, "UNAUTHENTICATED", "Sign in to manage notes.")
  }

  if (permanent) {
    const { data: deleted, error } = await supabase
      .from("notes")
      .delete()
      .eq("public_id", publicId)
      .eq("owner_id", user.id)
      .select("public_id")
      .maybeSingle()
    if (error) {
      return errorResponse(
        500,
        "INTERNAL_ERROR",
        "Could not delete the note. Please try again."
      )
    }
    if (!deleted) {
      return errorResponse(404, "NOT_FOUND", "Note not found.")
    }
    return successResponse({ deleted: true, permanent: true })
  }

  const { data: trashed, error } = await supabase
    .from("notes")
    .update({ deleted_at: new Date().toISOString() })
    .eq("public_id", publicId)
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .select("public_id")
    .maybeSingle()
  if (error) {
    return errorResponse(
      500,
      "INTERNAL_ERROR",
      "Could not move the note to trash. Please try again."
    )
  }
  if (!trashed) {
    return errorResponse(404, "NOT_FOUND", "Note not found.")
  }
  return successResponse({ deleted: true, permanent: false })
}

import { type NextRequest } from "next/server"

import { errorResponse, successResponse } from "@/lib/api/response"
import { assertCsrf } from "@/lib/security/csrf"
import { createClient } from "@/lib/supabase/server"
import { updateNoteSchema } from "@/lib/validation/notes"

const PUBLIC_COLUMNS =
  "public_id, title, content, content_format, visibility, editing_policy, expires_at, created_at, updated_at"

/**
 * Public note retrieval. Private, expired, soft-deleted, and missing notes
 * all return the same NOT_FOUND response — no existence oracle.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  const { publicId } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("notes")
    .select(PUBLIC_COLUMNS)
    .eq("public_id", publicId)
    .maybeSingle()

  if (error || !data) {
    return errorResponse(404, "NOT_FOUND", "Note not found.")
  }
  return successResponse(data)
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

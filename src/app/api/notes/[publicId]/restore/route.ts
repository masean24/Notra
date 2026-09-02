import { type NextRequest } from "next/server"

import { errorResponse, successResponse } from "@/lib/api/response"
import { assertCsrf } from "@/lib/security/csrf"
import { createClient } from "@/lib/supabase/server"

/**
 * Restores a soft-deleted note owned by the caller (dashboard trash).
 * Owner-only via RLS; a missing or non-trashed note is NOT_FOUND.
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

  const { data: restored, error } = await supabase
    .from("notes")
    .update({ deleted_at: null })
    .eq("public_id", publicId)
    .eq("owner_id", user.id)
    .not("deleted_at", "is", null)
    .select("public_id")
    .maybeSingle()

  if (error) {
    return errorResponse(
      500,
      "INTERNAL_ERROR",
      "Could not restore the note. Please try again."
    )
  }
  if (!restored) {
    return errorResponse(404, "NOT_FOUND", "Note not found.")
  }
  return successResponse({ restored: true })
}

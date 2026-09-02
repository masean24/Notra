import { type NextRequest } from "next/server"

import { errorResponse, successResponse } from "@/lib/api/response"
import { assertCsrf } from "@/lib/security/csrf"
import { createClient } from "@/lib/supabase/server"
import type { NoteUpdate } from "@/types/database"
import { updateSeoSchema } from "@/lib/validation/notes"

/**
 * Owner-only SEO metadata update (SPEC §11): social title/description,
 * canonical URL, and the uploaded social image's storage path. Applied
 * directly through column grants + RLS (`notes_update_own`); a missing note
 * and a note owned by someone else are both NOT_FOUND.
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
  const parsed = updateSeoSchema.safeParse(payload)
  if (!parsed.success) {
    return errorResponse(
      400,
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid request."
    )
  }

  const input = parsed.data
  const update: NoteUpdate = {}
  if (input.metaTitle !== undefined) update.meta_title = input.metaTitle
  if (input.metaDescription !== undefined) {
    update.meta_description = input.metaDescription
  }
  if (input.canonicalUrl !== undefined) update.canonical_url = input.canonicalUrl
  if (input.socialImagePath !== undefined) {
    update.social_image_path = input.socialImagePath
  }

  const { data: updated, error } = await supabase
    .from("notes")
    .update(update)
    .eq("public_id", publicId)
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .select("public_id")
    .maybeSingle()

  if (error) {
    return errorResponse(
      500,
      "INTERNAL_ERROR",
      "Could not update the SEO settings. Please try again."
    )
  }
  if (!updated) {
    return errorResponse(404, "NOT_FOUND", "Note not found.")
  }
  return successResponse({ updated: true })
}

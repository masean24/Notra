import { type NextRequest } from "next/server"

import { errorResponse, mapRpcError, successResponse } from "@/lib/api/response"
import { assertCsrf } from "@/lib/security/csrf"
import { createClient } from "@/lib/supabase/server"
import { restoreRevisionSchema } from "@/lib/validation/notes"

/**
 * Revision history for a note the caller owns. Reads go through the
 * `note_revisions_select_own` RLS policy; content is only included when a
 * specific revision is requested (?revision=N) so list responses stay small.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  const { publicId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return errorResponse(401, "UNAUTHENTICATED", "Sign in to view history.")
  }

  // Resolve the note through RLS first: 404 covers missing and not-owned.
  const { data: note } = await supabase
    .from("notes")
    .select("id")
    .eq("public_id", publicId)
    .eq("owner_id", user.id)
    .maybeSingle()
  if (!note) {
    return errorResponse(404, "NOT_FOUND", "Note not found.")
  }

  const revisionParam = request.nextUrl.searchParams.get("revision")
  if (revisionParam !== null) {
    const revisionNo = Number.parseInt(revisionParam, 10)
    if (!Number.isInteger(revisionNo) || revisionNo <= 0) {
      return errorResponse(400, "VALIDATION_ERROR", "Invalid revision number.")
    }
    const { data: revision, error } = await supabase
      .from("note_revisions")
      .select("revision_no, title, content, created_at")
      .eq("note_id", note.id)
      .eq("revision_no", revisionNo)
      .maybeSingle()
    if (error) {
      return errorResponse(
        500,
        "INTERNAL_ERROR",
        "Could not load the revision. Please try again."
      )
    }
    if (!revision) {
      return errorResponse(404, "NOT_FOUND", "Revision not found.")
    }
    return successResponse(revision)
  }

  const { data: revisions, error } = await supabase
    .from("note_revisions")
    .select("revision_no, title, created_at")
    .eq("note_id", note.id)
    .order("revision_no", { ascending: false })
    .limit(200)
  if (error) {
    return errorResponse(
      500,
      "INTERNAL_ERROR",
      "Could not load the history. Please try again."
    )
  }
  return successResponse({ revisions })
}

/**
 * Restores a past revision via the `restore_revision` SECURITY DEFINER RPC.
 * The rollback itself becomes a new revision — history is never rewritten.
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

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be JSON.")
  }
  const parsed = restoreRevisionSchema.safeParse(payload)
  if (!parsed.success) {
    return errorResponse(
      400,
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid request."
    )
  }

  const { data: newRevisionNo, error } = await supabase.rpc(
    "restore_revision",
    {
      p_public_id: publicId,
      p_revision_no: parsed.data.revisionNo,
    }
  )
  if (error) {
    return mapRpcError(error)
  }
  return successResponse({ restoredFrom: parsed.data.revisionNo, revisionNo: newRevisionNo })
}

import { type NextRequest } from "next/server"

import { errorResponse, mapRpcError, successResponse } from "@/lib/api/response"
import { editSessionCookieName } from "@/lib/notes/sessions"
import { assertCsrf } from "@/lib/security/csrf"
import { createClient } from "@/lib/supabase/server"
import { saveNoteSchema } from "@/lib/validation/notes"

/**
 * Saves a note via the SECURITY DEFINER `save_note` RPC. Guests authenticate
 * with their HttpOnly edit-session cookie; owners are verified inside the RPC
 * through auth.uid().
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  const csrfFailure = assertCsrf(request)
  if (csrfFailure) {
    return csrfFailure
  }

  const { publicId } = await params
  const supabase = await createClient()

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be JSON.")
  }

  const parsed = saveNoteSchema.safeParse(payload)
  if (!parsed.success) {
    return errorResponse(
      400,
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid request."
    )
  }
  const input = parsed.data

  const token = request.cookies.get(editSessionCookieName(publicId))?.value

  const { data: revisionNo, error } = await supabase.rpc("save_note", {
    p_public_id: publicId,
    p_title: input.title,
    p_content: input.content ?? null,
    p_content_format: input.contentFormat,
    p_token: token ?? null,
  })
  if (error) {
    return mapRpcError(error)
  }
  return successResponse({ revisionNo })
}

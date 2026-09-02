import { type NextRequest } from "next/server"

import { errorResponse, mapRpcError, successResponse } from "@/lib/api/response"
import { assertCsrf } from "@/lib/security/csrf"
import { createClient } from "@/lib/supabase/server"
import { revokeShareSchema } from "@/lib/validation/notes"

/** Revokes one of the caller's share links by id. */
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
    return errorResponse(401, "UNAUTHENTICATED", "Sign in to manage sharing.")
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be JSON.")
  }
  const parsed = revokeShareSchema.safeParse(payload)
  if (!parsed.success) {
    return errorResponse(
      400,
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid request."
    )
  }

  const { data, error } = await supabase.rpc("revoke_share_link", {
    p_public_id: publicId,
    p_share_id: parsed.data.shareId,
  })
  if (error) {
    return mapRpcError(error)
  }
  return successResponse({ revoked: data === true })
}

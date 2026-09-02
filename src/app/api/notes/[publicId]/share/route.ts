import { type NextRequest } from "next/server"

import { errorResponse, mapRpcError, successResponse } from "@/lib/api/response"
import { assertCsrf } from "@/lib/security/csrf"
import { createClient } from "@/lib/supabase/server"
import { createShareSchema } from "@/lib/validation/notes"

/**
 * Mints an additional share link via `create_share_link`. The raw token is
 * returned exactly once by this response — the database stores only its
 * SHA-256 hash, and the token is never logged.
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
    return errorResponse(401, "UNAUTHENTICATED", "Sign in to manage sharing.")
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be JSON.")
  }
  const parsed = createShareSchema.safeParse(payload)
  if (!parsed.success) {
    return errorResponse(
      400,
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid request."
    )
  }

  const { data, error } = await supabase.rpc("create_share_link", {
    p_public_id: publicId,
    p_permission: parsed.data.permission,
    p_expires_at: parsed.data.expiresAt,
  })
  if (error) {
    return mapRpcError(error)
  }

  const result = data as {
    share_id: string
    token: string
    permission: string
    expires_at: string
  }
  return successResponse({
    shareId: result.share_id,
    token: result.token,
    permission: result.permission,
    expiresAt: result.expires_at,
    url: `/s/${result.token}`,
  })
}

/** Lists the note's share links (metadata only — never tokens or hashes). */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  const { publicId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return errorResponse(401, "UNAUTHENTICATED", "Sign in to manage sharing.")
  }

  const { data, error } = await supabase.rpc("list_share_links", {
    p_public_id: publicId,
  })
  if (error) {
    return mapRpcError(error)
  }
  return successResponse({ shares: data })
}

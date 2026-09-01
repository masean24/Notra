import { type NextRequest } from "next/server"

import { errorResponse, successResponse } from "@/lib/api/response"
import { createClient } from "@/lib/supabase/server"

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

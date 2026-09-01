import { type NextRequest } from "next/server"

import { successResponse } from "@/lib/api/response"
import { editSessionCookieName } from "@/lib/notes/sessions"
import { assertCsrf } from "@/lib/security/csrf"
import { createClient } from "@/lib/supabase/server"

/** Revokes the caller's edit session and clears its cookie. */
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
  const cookieName = editSessionCookieName(publicId)
  const token = request.cookies.get(cookieName)?.value

  let revoked = false
  if (token) {
    const { data } = await supabase.rpc("revoke_edit_session", {
      p_public_id: publicId,
      p_token: token,
    })
    revoked = data === true
  }

  const response = successResponse({ revoked })
  response.cookies.set({
    name: cookieName,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  })
  return response
}

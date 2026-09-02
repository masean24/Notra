import { NextResponse } from "next/server"

import { DEFAULT_AUTH_REDIRECT } from "@/lib/auth/redirect"
import { createClient } from "@/lib/supabase/server"

/**
 * Supabase auth redirect handler. Exchanges the one-time auth code for a
 * session and sets the session cookies. The `next` parameter is restricted
 * to same-origin relative paths to prevent open redirects.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")

  const nextParam = searchParams.get("next")
  const next =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : DEFAULT_AUTH_REDIRECT

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Generic failure — no detail about the cause, so nothing sensitive leaks
  // through the URL.
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}

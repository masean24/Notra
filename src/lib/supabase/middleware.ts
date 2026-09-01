import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import { CSRF_COOKIE_NAME } from "@/lib/constants"

/**
 * Refreshes the Supabase auth session on every matched request so that
 * Server Components and Route Handlers always see a fresh cookie session,
 * and issues the CSRF double-submit cookie when absent. When Supabase env
 * vars are absent (e.g. a fresh clone before setup), the request passes
 * through untouched instead of crashing.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  // Double-submit CSRF token: JS-readable cookie (deliberately not HttpOnly;
  // never stored in localStorage) echoed back via the x-csrf-token header on
  // mutations and validated server-side.
  if (!request.cookies.get(CSRF_COOKIE_NAME)) {
    const token = crypto.randomUUID()
    request.cookies.set(CSRF_COOKIE_NAME, token)
    response = NextResponse.next({ request })
    response.cookies.set(CSRF_COOKIE_NAME, token, {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    return response
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        )
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  })

  // IMPORTANT: do not remove. getUser() triggers token refresh when needed.
  await supabase.auth.getUser()

  return response
}

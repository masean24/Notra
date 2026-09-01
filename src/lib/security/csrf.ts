import type { NextRequest } from "next/server"

import { errorResponse } from "@/lib/api/response"
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "@/lib/constants"

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }
  let mismatch = 0
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}

/**
 * Double-submit cookie CSRF check for mutation routes. The token lives in a
 * JS-readable cookie (deliberately NOT HttpOnly and never in localStorage —
 * see Section 16) and must be echoed in the request header.
 */
export function assertCsrf(request: NextRequest): Response | null {
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value
  const headerToken = request.headers.get(CSRF_HEADER_NAME)

  if (!cookieToken || !headerToken || !timingSafeEqual(cookieToken, headerToken)) {
    return errorResponse(403, "CSRF_INVALID", "Invalid or missing CSRF token.")
  }
  return null
}

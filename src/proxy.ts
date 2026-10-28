import { NextResponse, type NextRequest } from "next/server"

import { updateSession } from "@/lib/supabase/middleware"

/**
 * Next.js 16 renamed the `middleware` file convention to `proxy` (the
 * exported function must be named `proxy`).
 *
 * Responsibilities:
 *   1. Session refresh + CSRF cookie (updateSession).
 *   2. The ADMIN_SECRET_PATH rewrite (SPEC §14): requests to the operator's
 *      secret path are rewritten to /internal-admin and tagged with a header
 *      carrying the secret. A client hitting /internal-admin directly cannot
 *      produce that header, so it receives the standard 404; a forged header
 *      requires knowing the secret anyway. The page then independently
 *      re-checks profiles.is_admin server-side on every request.
 */
export async function proxy(request: NextRequest) {
  const response = await updateSession(request)

  const secret = process.env.ADMIN_SECRET_PATH
  if (
    secret &&
    secret.startsWith("/") &&
    secret.length > 1 &&
    request.nextUrl.pathname === secret
  ) {
    const url = request.nextUrl.clone()
    url.pathname = "/internal-admin"
    // The tag must ride on the forwarded REQUEST headers so the page's
    // headers() can read it; a direct /internal-admin visit has no such
    // request header, and forging it requires knowing the secret.
    const forwardedHeaders = new Headers(request.headers)
    forwardedHeaders.set("x-notra-admin-entry", secret)
    const rewritten = NextResponse.rewrite(url, {
      request: { headers: forwardedHeaders },
    })
    // Mirror on the response for observability/debugging only.
    rewritten.headers.set("x-notra-admin-entry", secret)
    return rewritten
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
}

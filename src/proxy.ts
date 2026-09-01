import { updateSession } from "@/lib/supabase/middleware"

// Next.js 16 renamed the `middleware` file convention to `proxy` (the
// exported function must be named `proxy`). This fills the `middleware.ts`
// role described in SPEC.md: session refresh now, the ADMIN_SECRET_PATH
// rewrite in a later phase.
export async function proxy(request: Request) {
  return await updateSession(request as Parameters<typeof updateSession>[0])
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

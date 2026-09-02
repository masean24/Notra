import { type NextRequest } from "next/server"

import { errorResponse } from "@/lib/api/response"
import { assertCsrf } from "@/lib/security/csrf"
import {
  consumeRateLimit,
  getClientIp,
  hashIp,
} from "@/lib/rate-limit"
import { createClient } from "@/lib/supabase/server"

/**
 * Records a decoy /admin visit (SPEC §14): durable rate limit per hashed IP,
 * then the hashed IP + path go to admin_probe_log. No raw IP is stored and
 * nothing identifies the visitor beyond the salted hash already used for
 * abuse prevention elsewhere.
 */
export async function POST(request: NextRequest) {
  const csrfFailure = assertCsrf(request)
  if (csrfFailure) {
    return csrfFailure
  }

  const ipHash = hashIp(getClientIp(request))
  const supabase = await createClient()

  const allowed = await consumeRateLimit(
    supabase,
    `admin-probe:${ipHash}`,
    10,
    5 * 60
  )
  if (!allowed) {
    return errorResponse(
      429,
      "RATE_LIMITED",
      "Too many requests. Please try again later."
    )
  }

  await supabase.rpc("log_admin_probe", {
    p_ip_hash: ipHash,
    p_path: request.nextUrl.pathname,
  })
  return new Response(null, { status: 204 })
}

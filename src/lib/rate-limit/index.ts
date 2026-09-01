import { createHash } from "node:crypto"

import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Durable rate limiting via the `rate_limits` Postgres table (Section 17).
 * Atomic windowed upsert inside SECURITY DEFINER `consume_rate_limit`.
 * In-memory limiters are forbidden — this survives serverless restarts.
 */
export async function consumeRateLimit(
  supabase: SupabaseClient,
  key: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const { data, error } = await supabase.rpc("consume_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  })
  if (error) {
    // Fail closed: if the limiter cannot run, reject the request rather than
    // silently removing the protection.
    console.error("rate limit unavailable:", error.message)
    return false
  }
  return data === true
}

/** SHA-256 of the client IP, salted with a server-side pepper. The raw IP is
 * never stored. */
export function hashIp(ip: string): string {
  const pepper = process.env.ENCRYPTION_KEY ?? ""
  return createHash("sha256").update(`${ip}:${pepper}`).digest("hex")
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }
  return request.headers.get("x-real-ip") ?? "unknown"
}

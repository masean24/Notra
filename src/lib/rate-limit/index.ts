import { createHash } from "node:crypto"

import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Durable rate limiting (SPEC §17).
 *
 * Checks Upstash Redis REST if configured via UPSTASH_REDIS_REST_URL and
 * UPSTASH_REDIS_REST_TOKEN; otherwise uses the atomic windowed upsert inside
 * the Postgres `rate_limits` table via the SECURITY DEFINER RPC `consume_rate_limit`.
 *
 * In-memory limiters are forbidden — this survives serverless restarts.
 */
export async function consumeRateLimit(
  supabase: SupabaseClient,
  key: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN

  if (upstashUrl && upstashToken) {
    try {
      const allowed = await consumeUpstashRedis(
        upstashUrl,
        upstashToken,
        key,
        limit,
        windowSeconds
      )
      if (allowed !== null) {
        return allowed
      }
    } catch (err) {
      console.warn("Upstash Redis error, falling back to PostgreSQL limiter:", err)
    }
  }

  // Fallback / default: PostgreSQL durable rate limit store
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

/**
 * Atomic counter via Upstash Redis REST pipeline:
 * Executes [["INCR", key], ["EXPIRE", key, windowSeconds]] in one HTTP roundtrip.
 * Returns boolean if successful, or null to trigger Postgres fallback.
 */
async function consumeUpstashRedis(
  url: string,
  token: string,
  key: string,
  limit: number,
  windowSeconds: number
): Promise<boolean | null> {
  const cleanUrl = url.replace(/\/+$/, "")
  const endpoint = `${cleanUrl}/pipeline`

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", `rl:${key}`],
      ["EXPIRE", `rl:${key}`, windowSeconds],
    ]),
    signal: AbortSignal.timeout(3000),
  })

  if (!response.ok) {
    return null
  }

  const results = (await response.json()) as Array<{ result?: unknown; error?: string }>
  if (!Array.isArray(results) || results.length === 0) {
    return null
  }

  const count = Number(results[0]?.result)
  if (!Number.isFinite(count)) {
    return null
  }

  return count <= limit
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

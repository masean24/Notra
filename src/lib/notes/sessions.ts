import { randomBytes } from "node:crypto"

import type { SupabaseClient } from "@supabase/supabase-js"

/** Edit-session cookie: HttpOnly, SameSite=Lax, 30-minute TTL, per note. */
export const EDIT_SESSION_COOKIE_PREFIX = "on_edit_"
export const EDIT_SESSION_TTL_SECONDS = 30 * 60

export function editSessionCookieName(publicId: string): string {
  return `${EDIT_SESSION_COOKIE_PREFIX}${publicId}`
}

/** Opaque session token — only its SHA-256 hash is ever stored server-side. */
export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url")
}

export type IssueSessionResult =
  | { status: "ok"; token: string; expiresAt: string }
  | { status: "invalid_code" | "locked" | "note_not_found" | "error" }

interface VerifyRpcPayload {
  status: "ok" | "invalid_code" | "locked" | "note_not_found"
  expires_at?: string
}

/**
 * Verifies an edit code and mints an edit session. The RPC returns a JSON
 * status object (instead of raising) so failed-attempt counters commit —
 * that is what makes the 8-attempt lockout actually stick.
 */
export async function issueEditSession(
  supabase: SupabaseClient,
  publicId: string,
  code: string,
  ipHash: string
): Promise<IssueSessionResult> {
  const token = generateSessionToken()
  const { data, error } = await supabase.rpc("verify_edit_code", {
    p_public_id: publicId,
    p_code: code,
    p_token: token,
    p_ip_hash: ipHash,
  })
  if (error) {
    console.error("verify_edit_code failed:", error.message)
    return { status: "error" }
  }
  const payload = data as VerifyRpcPayload
  if (payload?.status !== "ok" || !payload.expires_at) {
    const status = payload?.status ?? "error"
    return {
      status:
        status === "ok" ? "error" : status,
    }
  }
  return { status: "ok", token, expiresAt: payload.expires_at }
}

export async function hasEditSession(
  supabase: SupabaseClient,
  publicId: string,
  token: string | undefined
): Promise<boolean> {
  if (!token) {
    return false
  }
  const { data, error } = await supabase.rpc("check_edit_session", {
    p_public_id: publicId,
    p_token: token,
  })
  if (error) {
    console.error("check_edit_session failed:", error.message)
    return false
  }
  return data === true
}

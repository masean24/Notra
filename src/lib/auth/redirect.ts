/**
 * Shared auth-redirect helpers. `next` targets are restricted to same-origin
 * relative paths (no protocol-relative "//host") to prevent open redirects.
 */
export function sanitizeNextPath(
  next: string | null | undefined
): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/"
}

/** Absolute URL of /auth/callback carrying the sanitized `next` path. */
export function authCallbackUrl(next: string | null | undefined): string {
  const target = sanitizeNextPath(next)
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent(target)}`
}

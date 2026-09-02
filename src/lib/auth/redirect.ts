/**
 * Shared auth-redirect helpers. `next` targets are restricted to same-origin
 * relative paths (no protocol-relative "//host") to prevent open redirects.
 * The default destination after any successful sign-in is the dashboard.
 */
export const DEFAULT_AUTH_REDIRECT = "/dashboard"

export function sanitizeNextPath(
  next: string | null | undefined
): string {
  return next && next.startsWith("/") && !next.startsWith("//")
    ? next
    : DEFAULT_AUTH_REDIRECT
}

/** Absolute URL of /auth/callback carrying the sanitized `next` path. */
export function authCallbackUrl(next: string | null | undefined): string {
  const target = sanitizeNextPath(next)
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent(target)}`
}

/**
 * Reserved slugs (SPEC §13). Mirrored by the hardcoded list inside the
 * `claim_slug` SECURITY DEFINER function — the database check is the
 * authoritative one; this list is for immediate client-side feedback.
 */
export const RESERVED_SLUGS = new Set([
  "api",
  "new",
  "write",
  "login",
  "signup",
  "dashboard",
  "settings",
  "admin",
  "internal-admin",
  "n",
  "s",
  "notes",
  "auth",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "manifest.json",
  "_next",
  "public",
  "static",
  "assets",
  "docs",
  "help",
  "support",
  "about",
  "pricing",
  "terms",
  "privacy",
  "contact",
  "blog",
  "app",
  "www",
  "mail",
  "ftp",
  "root",
  "administrator",
  "null",
  "undefined",
])

/** 3–63 chars, lowercase letters/digits, no leading/trailing hyphen. */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(slug)
}

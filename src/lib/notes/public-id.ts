/**
 * Extracts a 7-character note public ID from raw user input: either the ID
 * itself, a full share URL (https://host/n/Ab8KxP2), or a relative path
 * (/n/Ab8KxP2). Used by the claim-guest-note tool in /settings.
 */
const PUBLIC_ID_PATTERN = /^[A-Za-z0-9]{7}$/

export function extractPublicId(input: string): string | null {
  const trimmed = input.trim()
  if (PUBLIC_ID_PATTERN.test(trimmed)) {
    return trimmed
  }

  let pathname = trimmed
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
    try {
      pathname = new URL(trimmed).pathname
    } catch {
      return null
    }
  }
  const match = pathname.match(/^\/n\/([A-Za-z0-9]{7})\/?$/)
  return match ? (match[1] ?? null) : null
}

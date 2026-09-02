# Security Policy

## Supported versions

Only the latest `master` (and releases cut from it) receives security fixes. If you self-host, keep the app and your Supabase stack up to date.

## Reporting a vulnerability

Please do **not** open a public GitHub issue for security problems.

Instead, use GitHub's private security advisory ("Report a vulnerability" on the repository's Security tab). If that is unavailable, contact the maintainers through a private channel listed on the repository profile.

Include: affected URL/route or file, reproduction steps, impact, and (if possible) a minimal proof of concept. You will get an acknowledgement within 7 days and status updates as the fix progresses. Credit is given in the advisory unless you prefer otherwise.

## Scope highlights

The following are in scope:

- Auth bypass, privilege escalation, or RLS gaps
- Existence oracles for private notes (anything that reveals whether a note/slug/admin path exists)
- Edit-code brute-forcing beyond the intended lockout, or leakage of edit codes
- Exposure of `SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_KEY`, or any user's stored Gemini key
- XSS via note content, import, or SEO fields
- CSRF or rate-limit bypass on mutation endpoints

Out of scope: self-hosting misconfiguration, brute-force on rate-limited endpoints without a novel bypass, and automated scanner noise without impact.

## Design notes for reviewers

- Edit codes are CSPRNG-generated, bcrypt-hashed in Postgres, shown exactly once, and never placed in URLs or localStorage.
- Share tokens are stored only as SHA-256 hashes; raw tokens exist only in the minted URL.
- The admin panel is reachable only via the `ADMIN_SECRET_PATH` rewrite **and** a server-side `profiles.is_admin` check per request; direct `/internal-admin` access returns the standard 404. Admin actions land in an append-only audit log.
- Stored Gemini keys are encrypted with AES-256-GCM using the server-only `ENCRYPTION_KEY`; plaintext keys are never logged or returned.
- Rate limiting is durable (Postgres, optionally Redis); raw IPs are only ever stored as salted SHA-256 hashes.

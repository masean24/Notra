# Notra — Master Build Specification v2

**Project:** Notra — Full-Featured Open-Source Notepad Studio
**License:** MIT. 100% free, forever. No paywalls, no paid tiers, no pricing pages, no "Pro plan" placeholders, no ads, no third-party tracking/analytics that phones home with user data.

---

## How To Use This Document (read before writing any code)

1. Save this file as `SPEC.md` at the repo root. It is the single source of truth. Do not work from memory — re-read the relevant sections at the start of every phase.
2. Work through the phases in Section 27 strictly in order. One phase at a time. `npm run dev` AND `npm run build` must both pass with zero errors before starting the next phase. Never write files spanning multiple phases without testing in between.
3. After every phase: (a) list every file created/changed, (b) give manual verification steps, (c) commit the work.
4. If any instruction here conflicts with a library's current documented API, follow the library's API and note the deviation in the phase summary.
5. Start from a clean, empty repo/folder. Never run this on top of old code.

---

## 0. Ground Rules

- This is a 100% free, open-source project. Never scaffold billing UI even as a stub.
- AI Assistant features are **Bring-Your-Own-Key (BYOK)**: the app never bundles a shared API key and never pays for anyone's AI usage. Each user supplies their own Google AI Studio (Gemini) API key. If no key is configured, AI features are cleanly disabled with a clear "Add your Gemini API key to enable this" prompt — never fake or mocked AI output.
- No mock/fake data for core functionality, ever. Everything must be genuinely wired to Supabase. If a feature cannot be built for real, ship an honest "not yet available" state instead.
- Never store secrets or session tokens in `localStorage` or `sessionStorage` — not edit codes, not session tokens, not CSRF tokens, not Gemini API keys. Session tokens live in HttpOnly cookies.
- Don't hardcode secrets. All secrets come from environment variables. `SUPABASE_SERVICE_ROLE_KEY` and `ENCRYPTION_KEY` must never be reachable from client code.
- Runtime requirements: Node.js ≥ 20.9 and TypeScript ≥ 5.1 (Next.js 16 minimums). Document this in the README.

## 1. Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack, Server Actions & Route Handlers)
- **Language:** TypeScript, strict mode, fully type-safe
- **Styling:** Tailwind CSS v4, OKLCH color space for dark and light themes
- **UI Components:** shadcn/ui primitives + lucide-react icons. Strict zero-emoji policy — clean SVG iconography only, never emoji in badges/cards/alerts/toasts
- **Rich-Text Engine:** Tiptap — headings, task lists, tables, code blocks, highlights, floating bubble menu. (If you pick a different editor, justify briefly.)
- **Database & Auth:** Supabase — PostgreSQL, Row Level Security, Auth, Storage, SECURITY DEFINER RPC functions
- **Offline client storage:** Dexie.js over IndexedDB for drafts and the sync queue — never localStorage
- **Validation:** Zod + React Hook Form
- **Toasts:** Sonner
- **Testing:** Vitest
- **Containerization:** Dockerfile + docker-compose.yml for self-hosting
- **AI:** Google Gemini via the Google AI Studio API, BYOK (Section 12)
- Avoid unnecessary dependencies. Deploy target is Vercel (serverless-compatible) but must also run via Docker for self-hosters.

## 2. Design System & Aesthetics

Aim for a "Linear / Vercel / Framer"-tier feel — refined, not flashy:

- High-contrast typography, subtle ambient background mesh glows, a blueprint dot-grid background (`bg-grid-dots`) on marketing surfaces, specular top-border highlights on cards
- Seamless dark/light/system theming via OKLCH tokens
- Zero emojis anywhere in the UI — Lucide SVG icons only
- Subtle micro-animations: hover elevation, glassmorphism (`backdrop-blur-md`) only where it adds clarity
- Keep it fast: no animation may block interactivity or hurt Core Web Vitals

## 3. Route Architecture

- `/` — Landing page: interactive studio playground (tabs previewing live writing, AI assistant preview, custom-slug visualizer — built against real functioning code paths, never fake demo data), bento feature grid, tech-stack badges, comparison table, self-hosting guide, FAQ accordion, footer CTA. Primary CTA: "Start Writing — Instant & Free" → `/new`.
- `/new` — The distraction-free Notepad Studio. Blank editor, writable instantly with zero login. Header: save status indicator, word-count/target progress, AI Assistant trigger, Templates menu, Export dropdown, Zen mode toggle, Save & Share dialog trigger.
- `/write` — permanent redirect to `/new` (one route, not a duplicate page).
- `/n/[publicId]` — Public view of a saved note, addressed by a 7-character cryptographically random ID (e.g. `/n/Ab8KxP2`). Read-only by default, with an "Unlock Editing" action that prompts for the edit code and grants a short-lived HttpOnly edit session on success.
- `/s/[token]` — Share-link redemption page (GET). Validates the share token server-side, then grants the scoped access (view or edit) defined by that share for its TTL. Expired/revoked/invalid tokens → 404-style page, with no information leak about which notes exist.
- `/[slug]` — Custom vanity short links for registered users (e.g. `yourapp.com/my-pitch-deck`). Resolves to a note. Any unclaimed, reserved, or malformed slug must return `notFound()` (404). Protected by a strict reserved-slugs list — at minimum all system routes plus `favicon.ico`, `robots.txt`, `sitemap.xml`, and `manifest.json` — and checked for collisions atomically at claim time.
- `/login`, `/signup` — Email/password + Google/GitHub OAuth via Supabase Auth.
- `/dashboard` — Authenticated hub: search, sort (updated/created/title), favorites, soft-delete trash with restore and permanent delete.
- `/settings` — Profile, Claim Guest Note tool, JSON backup export/import, Gemini API key field (Section 12).
- `/notes/[publicId]/seo` — SEO/sharing metadata tool: Open Graph and Twitter Card live previews, canonical URL, custom social image upload.
- `/admin` — Intentional decoy/honeypot. NOT the real admin panel. Shows a good-humored, multilingual "nice try" page (Indonesian, Javanese, English, Japanese, French, etc.) with a punchline re-roller and a harmless simulated fake terminal animation. Every hit is rate-limited and logged (IP hash + timestamp only, never more PII) purely for maintainer amusement/monitoring. This is cosmetic misdirection, not a security control.
- `/internal-admin` — The real admin panel. **Implementation note:** Next.js routes are file-based and cannot be driven by environment variables, so the panel lives at the fixed internal route `/internal-admin`, which returns 404 when accessed directly. `middleware.ts` rewrites requests from `ADMIN_SECRET_PATH` (operator-chosen env value, e.g. `/ops-7f3k`) to `/internal-admin`. Access requires BOTH: (a) arriving via the secret-path rewrite, AND (b) an authenticated session where `profiles.is_admin = true`, verified server-side on every request. The secret path is obscurity on top of real auth — never a substitute for it. Panel covers: user list, note moderation (view/soft-delete abusive notes), rate-limit/lockout overrides, basic usage stats.

## 4. Guest Writing & Edit Code Security

- Instant local autosave — from Phase 2 onward, `/new` persists the working draft to IndexedDB (minimal Dexie `drafts` table) so it survives refresh, browser restart, and temporary offline periods. The full sync queue arrives in Phase 7.
- Save dialog offers:
  - **Random code:** cryptographically secure (CSPRNG), human-readable format like `K8F2-XP91-MQ73`, unambiguous alphabet (no O/0, I/1).
  - **Custom code:** 6–64 characters, no whitespace, validated and rate-limited.
  - **Expiration:** Never / 1 hour / 1 day / 7 days / 30 days / Custom.
  - **Editing policy:** `edit_code` (anyone with the passcode) / `account` (owner only) / `read_only` (permanently locked).
- Edit codes are hashed server-side with **bcrypt inside PostgreSQL via pgcrypto** (`crypt(code, gen_salt('bf', 12))`). The raw code is never stored, never logged, and never placed in a URL. It is shown to the user exactly once on the save-success screen with a clear "cannot be recovered if lost" warning.
- Edit sessions: verifying a code issues an opaque random token; only its SHA-256 hash is stored server-side. The token goes to the browser as an HttpOnly, SameSite=Lax cookie, short TTL (30 minutes), revocable.
- Brute-force protection: 8 failed unlock attempts → 15-minute per-note lockout plus per-IP throttling.
- The public note ID is not a secret: random, short, never sequential.

## 5. Registered User Flow & Claiming

- Authenticated users can create/edit/delete/restore/organize notes, sync across devices, manage sharing, and view revision history.
- A logged-in user's own notes never need an edit code — authorization is via `owner_id` + RLS.
- From `/settings`, a logged-in user can claim a guest note using its link + edit code. On success, `owner_id` is reassigned; the note and its link are never destroyed or recreated.

## 6. Editor Features

- Prose formatting: H1–H6, bold, italic, underline, strikethrough, highlight, blockquote, horizontal rule
- Inline code and multi-line code blocks with monospace styling
- Bullet/ordered lists, interactive task checklists, resizable tables
- Links, images (upload with size limits via Supabase Storage), markdown shortcuts, undo/redo
- Floating bubble menu on text selection
- Outline panel: auto-generated table of contents from headings, click-to-scroll, copy heading anchor link, collapsible sections
- Word target: configurable goal with live progress bar and estimated reading time
- Template library: Blog Post, Meeting Notes, Essay, Resume, Email, and a few more, organized by category
- QR code generator: modal with a scannable QR code of the note's share link
- Zen/focus mode: fullscreen distraction-free writing, toggle button + Esc to exit
- Status indicator: Saving… / Saved / Unsaved changes / Offline, plus live word/character counts
- Export: `.txt`, `.md`, `.html`, `.json` (full structured backup)
- Import: `.md`, `.txt`, `.json` — validate and sanitize all imported content, never trust it blindly

## 7. Command Palette (Ctrl/Cmd+K)

Global modal supporting: New Note (**Alt+N** — Ctrl+N is a reserved browser shortcut and cannot be intercepted reliably, so use Alt+N), Save & Share (Ctrl+S, with `preventDefault`), Toggle Theme, Open History/Diff Viewer, Open Template Library, Export, Import, Open AI Assistant, navigation to Dashboard/Settings/Landing. Never override essential browser shortcuts (Ctrl+W, Ctrl+N, Ctrl+T).

## 8. Revision History

Every authorized save creates a revision snapshot (`note_revisions`). UI groups revisions by day, supports viewing a past revision, diffing it against current content, and restoring it. Keep the diff engine modular so a richer algorithm can be swapped in later.

## 9. Sharing & Expiration

- Visibility: Anyone with link / Private. Editing policy as in Section 4.
- Additional share links (`note_shares`) let an owner mint a separate opaque token with its own permission (view/edit) and expiry, independent of the primary edit code — for temporary collaborator access. The raw token appears only in the minted URL (shown once); the database stores only its SHA-256 hash, and `/s/[token]` looks up by hash.
- Expiration options: Never / 1h / 1d / 7d / 30d / Custom ISO datetime. Expired notes cannot be viewed or edited and show a clear expiration page. Never hard-delete immediately — a separate scheduled cleanup job (deferred, design only) handles permanent deletion later.

## 10. Offline-First Sync Architecture

- Dexie.js (IndexedDB) with at least four tables: `drafts`, `pendingOps`, `idMap`, `conflicts`.
- While offline, saves queue locally. When `navigator.onLine` becomes true, a background sync engine replays queued operations FIFO against `/api/notes/*`, with bounded retry/backoff and an explicit safeguard against infinite retry loops.
- Basic conflict handling: if the server's revision has moved since the local queued op was based on, surface a "keep mine / use server" banner rather than silently overwriting.
- **Expired edit sessions:** if a queued op replays after its edit-session cookie has expired, surface a "re-enter edit code" flow — never silently drop the user's work.
- Automatic cleanup of stale local data (old drafts, resolved ops, resolved conflicts past a reasonable age) so IndexedDB never grows unbounded.

## 11. SEO Tool (`/notes/[publicId]/seo`)

For notes the user owns: edit title/description used for social sharing, upload a custom social preview image (Supabase Storage, with size/MIME validation), live-preview Open Graph and Twitter Card rendering, and a canonical URL field. Only the note owner (or a valid edit session) can access this page.

## 12. AI Assistant — Bring Your Own Gemini Key

- **Single call path:** ALL AI calls — guest and logged-in — go through `POST /api/ai/complete`. The user's key travels in the request body for that request only, is forwarded to Google's Gemini API, and is never written to logs, error trackers, analytics, or the database, and never exposed to any user other than its owner. (Direct browser-to-Gemini calls are not used; Google's own guidance is to keep API keys out of client-side code and proxy through a backend.)
- **Logged-in users:** the key is stored encrypted at rest (AES-256-GCM using `ENCRYPTION_KEY` from env, never plaintext) in `profiles` so it syncs across their devices.
- **Guest users:** the key is kept only in IndexedDB on their own device, plainly labeled as local-only storage (no pretend client-side "encryption" — a key encrypted with another key shipped in the client bundle is just obfuscation), and sent only to `/api/ai/complete` per request.
- **No key configured:** every AI entry point (editor trigger, landing playground tab) shows an honest "Add your Gemini API key in Settings to enable AI writing help" state. Never a faked response.
- Suggested features once a key is present: continue-writing suggestions, tone rewrite, summarize note, generate a title. Keep the integration modular (one `lib/ai/gemini.ts` client) so the provider can be swapped later.
- Document clearly in the README and in-app: the app operator/maintainers are not responsible for and do not pay for each user's own Gemini usage or costs — it is entirely BYOK.

## 13. Database Model & RPCs (Supabase)

Tables (adjust if a better design emerges, but cover at minimum):

- `profiles` (id, username, display_name, avatar_url, is_admin bool default false, gemini_api_key_encrypted?, created_at, updated_at)
- `notes` (id, public_id unique, owner_id?, custom_slug unique?, title, content jsonb, content_format, edit_code_hash?, visibility, editing_policy, expires_at?, deleted_at?, favorite, revision_no, created_at, updated_at)
- `note_revisions` (id, note_id, revision_no, title, content jsonb, created_by, created_at)
- `edit_sessions` (id, note_id, token_hash, expires_at, revoked_at, created_at)
- `note_unlock_attempts` (id, note_id, ip_hash, attempt_count, locked_until)
- `note_shares` (id, note_id, token_hash, permission, expires_at, created_at)
- `attachments` (id, note_id, storage_path, mime_type, size, created_at)
- `admin_audit_log` (id, admin_id, action, target_id, created_at) — insert-only; no UPDATE/DELETE grants for any role
- `rate_limits` (key text primary key, count int, window_start timestamptz) — durable rate-limit store (Section 17)

`public_id` and `custom_slug` must be unique with proper indexes. `custom_slug` is validated against a hardcoded `RESERVED_SLUGS` list (system routes + `favicon.ico`, `robots.txt`, `sitemap.xml`, `manifest.json` + common words) at claim time, inside a transaction to avoid race conditions.

**SECURITY DEFINER RPC functions:**

- `create_guest_note` — atomic creation with public_id collision retry
- `save_note` — verifies edit session/ownership, increments revision, writes a revision snapshot
- `verify_edit_code` — bcrypt check **inside Postgres via pgcrypto** (`crypt(code, edit_code_hash) = edit_code_hash`), manages lockout counters, returns a session token on success. (Argon2id does not exist natively in Postgres — do not spec it here.)
- `claim_note` — verifies edit code, reassigns owner_id
- `claim_slug` — validates against reserved list + uniqueness, assigns custom_slug
- `restore_revision` — rolls note content back to a given revision number, creating a new revision entry for the rollback itself

## 14. Row Level Security

- Guests may only read notes that are explicitly public, not expired, and not soft-deleted.
- Owners can read/update/delete/manage sharing and revisions for their own notes.
- The anonymous role must never get direct UPDATE/INSERT grants on `notes`. All guest writes (create, edit-via-session, claim, slug-claim) go through the SECURITY DEFINER RPCs above, called from server-side route handlers — never directly from the client.
- `edit_code_hash`, `gemini_api_key_encrypted`, and other sensitive columns must be excluded from any grant reachable by anon/authenticated roles; access them only inside SECURITY DEFINER functions.
- Admin-only tables/actions (`admin_audit_log`, moderation actions) require `profiles.is_admin = true`, checked in the RLS policy itself, not just in application code.

## 15. API Architecture

Validate all input with Zod. Consistent response shape:

```json
{ "success": true, "data": {} }
{ "success": false, "error": { "code": "INVALID_EDIT_CODE", "message": "Invalid edit code." } }
```

Representative routes (adjust to Next.js 16 conventions):

- `POST /api/notes`
- `GET /api/notes/[publicId]`
- `PUT /api/notes/[publicId]/save`
- `POST /api/notes/[publicId]/verify-edit`
- `POST /api/notes/[publicId]/revoke-edit`
- `GET /api/notes/[publicId]/revisions`
- `POST /api/notes/[publicId]/claim`
- `POST /api/notes/[publicId]/claim-slug`
- `POST /api/notes/[publicId]/share` (mints a share token, returns the one-time URL)
- `POST /api/attachments`
- `POST /api/ai/complete` — forwards to Gemini using the caller's own key only (Section 12)
- `GET /s/[token]` — page route redeeming share links (not under /api; renders access or 404)
- `/internal-admin` + `middleware.ts` — admin surface per Section 3

Never leak whether a private note exists via error message differences.

## 16. Security Requirements

- CSRF protection on all mutations (server-validated token, never stored in localStorage)
- Rich-text content sanitized through an allowlist renderer before render — never raw `dangerouslySetInnerHTML` on untrusted content
- Rate limiting and IP throttling on sensitive endpoints (unlock attempts, note creation, AI calls) — durable store only (Section 17)
- Secure HttpOnly, SameSite cookies for all session tokens
- Strict CSP and security headers in `next.config.ts`; no `unsafe-eval` in production
- No edit codes or Gemini keys in URLs, logs, or client storage
- RLS enabled and correct on every table
- `SUPABASE_SERVICE_ROLE_KEY` and `ENCRYPTION_KEY` never reach client bundles

## 17. Abuse Prevention

- Rate limiting must use a **durable store**: by default an atomic upsert against the `rate_limits` Postgres table (works on Vercel serverless); optionally Upstash Redis if its env vars are present. **In-memory rate limiters are forbidden** — they do not survive serverless instances and silently stop working.
- Per-IP throttling, note-creation limits, edit-attempt limits (8 fails → 15-min lockout via `note_unlock_attempts`), expiration, max note size, max attachment size.
- Leave a clean integration seam for CAPTCHA later — do not implement it now.

## 18. Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # server-only
NEXT_PUBLIC_APP_URL=
ADMIN_SECRET_PATH=              # e.g. /ops-7f3k — operator-chosen, never committed
ENCRYPTION_KEY=                 # AES-256-GCM key for encrypting stored Gemini keys
UPSTASH_REDIS_REST_URL=         # optional — enables Redis-backed rate limiting
UPSTASH_REDIS_REST_TOKEN=       # optional
```

`SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_KEY`, and Upstash tokens must never be exposed to the client. `.env.example` lists these with placeholder values and comments, never real secrets.

## 19. Developer Experience & Open Source Files

Must run locally with `git clone` → `npm install` → `npm run dev`, and via `docker compose up`.

**Self-hosting & Supabase (be explicit):** the app's `docker-compose.yml` runs the Next.js app and expects a reachable Supabase backend. Document two supported paths in the README: (a) point the env vars at a hosted Supabase project, or (b) run Supabase's official self-hosted Docker stack (the separate `docker compose` setup Supabase publishes for self-hosting) on the same host and point the env vars there. Do not attempt to re-implement Supabase services inside the app's compose file.

Include: `.env.example`, `README.md` (installation, Supabase setup, env vars, migrations, local dev, Docker self-hosting, Vercel deployment, contribution workflow), `CONTRIBUTING.md`, `LICENSE` (MIT), `SECURITY.md`, `CODE_OF_CONDUCT.md`, `Dockerfile`, `docker-compose.yml`, `supabase/migrations/`. Use the placeholder name Notra, kept easy to rebrand.

## 20. Testing

Minimum Vitest coverage: note creation, public note retrieval, edit-code generation/verification (valid + invalid), expired note handling, authorization checks, guest editing, authenticated editing, note claiming, slug claiming (including reserved-slug rejection), revision creation/restore, Zod schema validation for all major forms. (Playwright E2E is intentionally deferred — note it as future work.)

## 21. Error & Edge-Case States

Clear, non-blank UI states for: Loading, Saving, Saved, Offline, Error, Not Found, Expired, Unauthorized, Invalid Edit Code, Rate Limited. Polished 404, generic error, expired-note, and unauthorized pages.

## 22. Accessibility & Responsiveness

- Keyboard-navigable everywhere, visible focus states, semantic HTML, ARIA labels on icon-only buttons
- Responsive: sidebar + editor on desktop, compact sidebar on tablet, editor-first on mobile, usable down to ~360px width
- Respect `prefers-reduced-motion` for the marketing page's ambient animations

## 23. Design Details for the Landing Page

- Bento feature grid: guest-first writing, edit codes, offline support, revisions, custom slugs, AI assistant (BYOK), self-hosting
- Comparison table: Notra vs. a generic "typical online notepad" (login required? ads? tracking? open source? self-hostable?) — factual and fair, never disparaging a named competitor
- Tech stack badges (Next.js, Supabase, Tailwind, etc.)
- FAQ accordion: is it really free, do I need an account, what happens if I lose my edit code, how is my data handled, can I self-host
- Self-hosting quick guide teaser linking to the full docs in the README

## 24. Command & Keyboard Shortcuts Reference

Implement the shortcuts in Sections 6–7 without overriding essential browser shortcuts (never hijack Ctrl+W, Ctrl+N, Ctrl+T). Show a shortcuts cheat-sheet reachable from the command palette.

## 25. Project Structure (adjust if a better Next.js 16 architecture fits)

```
src/
├── app/
│   ├── page.tsx                    # landing page
│   ├── new/                        # editor ( /write redirects here )
│   ├── n/[publicId]/
│   ├── s/[token]/                  # share-link redemption page
│   ├── [slug]/                     # vanity slugs ( notFound() if unclaimed )
│   ├── login/  signup/
│   ├── dashboard/  settings/
│   ├── notes/[publicId]/seo/
│   ├── admin/                      # decoy joke page
│   ├── internal-admin/             # real admin; 404 unless rewritten by middleware
│   └── api/
├── components/
│   ├── editor/  notes/  auth/  sharing/  dashboard/  ai/  admin/  ui/
├── lib/
│   ├── supabase/  auth/  notes/  sync/  security/  validation/  ai/  rate-limit/
├── middleware.ts                   # ADMIN_SECRET_PATH → /internal-admin rewrite + guards
├── hooks/  types/  config/
```

## 26. Future Architecture (design for it, do not build it now)

Real-time multi-cursor collaboration, comments/mentions, CRDT-based sync, end-to-end encryption, workspaces/teams, plugin system, desktop/mobile apps, public API keys, webhooks, Playwright E2E. Keep clean abstractions (the sync engine, the content schema) so these can be added without a rewrite.

## 27. Execution Plan — Work Through These Phases In Order

Complete each phase to a fully working state before moving to the next. Summarize what changed after each phase.

- **Phase 1 — Foundation.** Next.js 16 + TypeScript + Tailwind v4 (OKLCH tokens) + shadcn/ui. Supabase project + initial profiles/notes schema + migrations folder. Supabase Auth (email/password first). Base editor mounted at `/new` (not yet wired to save). Skeleton landing page at `/`.
- **Phase 2 — Guest Core Loop + Local Drafts.** public_id generator (CSPRNG, non-sequential). Random/custom edit code + bcrypt hashing via pgcrypto. Full Save & Share dialog (code, expiration, editing policy). `POST /api/notes`, `GET /api/notes/[publicId]`. `/n/[publicId]` read-only view + unlock-editing flow + edit session cookie + brute-force lockout. RLS + SECURITY DEFINER RPCs for guest create/verify/save. Minimal Dexie `drafts` table so `/new` survives refresh from now on.
- **Phase 3 — Accounts & Dashboard.** Google/GitHub OAuth. `/dashboard` (search, sort, favorites, trash/soft-delete). Full CRUD for owned notes. Claim guest note flow in `/settings`.
- **Phase 4 — Revisions, Sharing, Expiration, Import/Export.** Revision snapshots + history UI + diff + restore. `note_shares` + `/s/[token]` redemption page. Expiration enforcement + expired-note page + scheduled cleanup job design. Export (txt/md/html/json) and import (md/txt/json) with validation.
- **Phase 5 — Vanity Slugs & SEO Tool.** custom_slug claiming with reserved-list + collision protection, `/[slug]` resolver with 404 for unclaimed slugs. `/notes/[publicId]/seo` with Open Graph/Twitter live preview and social image upload.
- **Phase 6 — Rich Editor Features.** Outline/TOC panel, word target + progress + reading time, template library, QR code share modal, zen/focus mode, markdown shortcuts, bubble menu polish.
- **Phase 7 — Full Offline & Sync Engine.** Dexie tables (drafts, pendingOps, idMap, conflicts), background FIFO sync engine with retry/backoff and loop safety, conflict banner, expired-edit-session re-verify flow, periodic local cleanup of stale entries.
- **Phase 8 — AI Assistant (BYOK Gemini).** Settings field for the user's Gemini API key (encrypted at rest for logged-in users, IndexedDB for guests), `lib/ai/gemini.ts` client, `/api/ai/complete` route forwarding the caller's key only, editor AI trigger + command palette entry, honest disabled-state UI when no key is present.
- **Phase 9 — Admin Surface.** Decoy `/admin` joke page (multilingual, punchline reroller, fake terminal animation), `middleware.ts` secret-path rewrite for `/internal-admin` gated by `profiles.is_admin` + server-side auth check, `admin_audit_log`, moderation actions (soft-delete abusive notes, view lockouts).
- **Phase 10 — Polish, Security Hardening, Self-Hosting.** Full responsive + accessibility pass, command palette + shortcuts cheat-sheet, all error/edge-case states, final CSP/security headers, durable rate limiting across all sensitive endpoints, Dockerfile + docker-compose.yml + documented Supabase self-hosting paths, Vitest suite, landing page finalized.

## 28. Final Deliverable

After all phases, provide: final project structure, full database schema + Supabase SQL migrations, required environment variables, local setup instructions (npm and Docker), deployment instructions (Vercel), summary of implemented security measures, list of implemented features, list of intentionally deferred features (Section 26) and why, and recommended next steps.

Verify before declaring the project done:

- [ ] `/` is a landing page, not the editor
- [ ] `/new` is writable instantly with zero login, and drafts survive refresh from Phase 2 onward
- [ ] Save produces a unique public URL + edit code shown exactly once
- [ ] Random edit codes use a CSPRNG; custom codes are validated
- [ ] Edit codes are hashed with bcrypt in Postgres (pgcrypto); never plaintext in the DB, never in a URL, never in localStorage
- [ ] Anyone with the link can view a public note; only authorized parties can edit
- [ ] Brute-force edit-code attempts are rate-limited with a durable store (no in-memory limiter)
- [ ] Logged-in users can fully manage their own notes and claim guest notes
- [ ] Custom vanity slugs work; reserved system paths cannot be overwritten; unclaimed slugs 404
- [ ] `/s/[token]` share links work with view/edit permissions and expiry; tokens stored hashed
- [ ] All data is genuinely persisted in Supabase — nothing core is mocked
- [ ] Offline drafting and sync work via IndexedDB, including the expired-session re-verify flow
- [ ] Revisions, sharing, and expiration work end-to-end
- [ ] All AI calls go through `/api/ai/complete` with the caller's own key; the Gemini assistant works BYOK and gracefully disables without a key — no bundled/shared key, no faked responses, no keys in logs
- [ ] `/admin` is a harmless decoy; `/internal-admin` returns 404 when accessed directly; the real admin panel only works via the `ADMIN_SECRET_PATH` rewrite AND `is_admin = true`
- [ ] RLS is correctly configured on every table
- [ ] No secret (service role key, encryption key, any user's Gemini key) ever reaches the client
- [ ] `npm run build` succeeds and `docker compose up` works with the documented Supabase prerequisite
- [ ] No pricing/paywall/ad elements anywhere

# Notra

> Your thoughts, smarter.

Notra is an AI-powered notes and knowledge workspace. MIT licensed, 100% free, forever — no paywalls, no ads, no tracking.

Start writing instantly with zero login, save and share notes with a link, claim vanity slugs, keep revisions, work offline, and use an AI writing assistant with **your own** Gemini API key. Manage everything from a dashboard when you choose to create an account.

## Requirements

- Node.js ≥ 20.9
- A [Supabase](https://supabase.com) project (free tier is enough)

## Quick start

```bash
git clone <your-fork-url> notra
cd notra
npm install
cp .env.example .env.local   # then fill in your values
npm run dev
```

Open http://localhost:3000 and start writing at `/new` — no account needed.

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com) (or self-host Supabase using [their official Docker stack](https://supabase.com/docs/guides/self-hosting)).
2. In the dashboard, copy **Project URL** and **anon public key** into `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Apply the migrations from `supabase/migrations/` **in order** (0001 → 0008) — either with the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started):
   ```bash
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```
   or by pasting each migration file into the dashboard **SQL Editor**.
4. In **Authentication → Sign In / Up**, enable Email provider. For local development you can disable "Confirm email"; if you keep it enabled, signups receive a confirmation link that redirects to `/auth/callback`.
5. Optional — Google/GitHub OAuth: enable the providers in **Authentication → Providers** and add your app URL as a redirect target. The sign-in buttons already exist.

## Environment variables

See [`.env.example`](./.env.example) for the full annotated list.

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Supabase anon key (RLS-protected) |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only | Never exposed to the client |
| `NEXT_PUBLIC_APP_URL` | public | Canonical base URL of the app |
| `ADMIN_SECRET_PATH` | server | Secret path rewritten to `/internal-admin` (e.g. `/ops-7f3k`) |
| `ENCRYPTION_KEY` | server-only | AES-256-GCM key; encrypts stored Gemini API keys and salts IP hashes. Generate with `openssl rand -base64 32` |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | server-only | Optional Redis rate limiting (the durable Postgres limiter is the default) |

Never commit `.env.local`. Server-only secrets must never be referenced from client code.

## Scripts

```bash
npm run dev     # start the dev server
npm run build   # production build (also emits .next/standalone for Docker)
npm run start   # serve the production build
npm run lint    # eslint
npm test        # vitest (unit + integration; integration skips without Supabase env)
```

## AI assistant (BYOK Gemini)

The AI assistant is **bring-your-own-key**: every AI call goes through the app's own `POST /api/ai/complete` route and is forwarded to Google's Gemini API using *your* key.

- **The app operator/maintainers are not responsible for, and do not pay for, your Gemini usage or costs.** Your key, your account, your quota.
- Logged-in users may store their key in Settings — it is encrypted at rest with `ENCRYPTION_KEY` (AES-256-GCM) and never displayed again.
- Guests keep the key only in their browser's IndexedDB on that device, clearly labeled as local-only, and it is sent per request.
- Keys are never logged, never placed in URLs, and never exposed to other users. Without a key, AI features show an honest "add your key" state — there are no fake or bundled responses.

## Admin surface

`/admin` is a harmless multilingual decoy. The real panel lives at `/internal-admin`, which returns the standard 404 unless the request was rewritten from your `ADMIN_SECRET_PATH` **and** the signed-in user has `is_admin = true` in `profiles`.

To make yourself an admin after signing up, run this in the Supabase SQL Editor:

```sql
update public.profiles set is_admin = true where id = '<your-user-uuid>';
```

Admin actions (note moderation, lockout overrides) are written to the append-only `admin_audit_log`.

## Self-hosting

The `docker-compose.yml` runs **only the Next.js app**. It expects a reachable Supabase backend; the app never re-implements Supabase services. Two supported paths:

### Path A — hosted Supabase

1. Create a hosted Supabase project, apply the migrations (see above), and fill `.env.local` with its URL and keys.
2. ```bash
   docker compose up --build
   ```
3. Open http://localhost:3000.

> `NEXT_PUBLIC_*` variables are baked in at build time. If your Supabase project changes, rebuild: `docker compose build --build-arg NEXT_PUBLIC_SUPABASE_URL=... --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=...`

### Path B — self-hosted Supabase

1. Run [Supabase's official self-hosting stack](https://supabase.com/docs/guides/self-hosting) — its own `docker compose` setup — on the same host.
2. Apply the migrations via that stack's Studio SQL editor.
3. Point `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` at your self-hosted instance (e.g. `http://localhost:8000` with its API keys), then `docker compose up --build`.

### Vercel

Deploy the repo to Vercel, set the environment variables (including the server-only ones) in the project settings, and build with the defaults (`npm run build`). Point `NEXT_PUBLIC_APP_URL` at the deployment URL.

## Security notes (summary)

- Edit codes use a CSPRNG, are stored only as bcrypt hashes (pgcrypto), and are never placed in URLs or localStorage.
- Every guest write flows through `SECURITY DEFINER` RPCs; row-level security is enabled on every table.
- CSRF double-submit tokens protect all mutations; rate limiting is durable (Postgres by default, optional Redis) — never in-memory.
- Raw IPs are never stored — only salted SHA-256 hashes.
- Private/missing notes render an identical 404 (no existence oracle); expired public notes show a clear expiration page.
- Strict CSP with no `unsafe-eval` in production, `X-Frame-Options`, `nosniff`, and restrictive `Permissions-Policy` headers.
- See [SECURITY.md](./SECURITY.md) for responsible disclosure.

## Roadmap

All ten phases from `SPEC.md` are implemented:

1. **Foundation** — scaffold, Supabase schema + RLS, auth, editor at `/new`. ✅
2. Guest core loop + local drafts. ✅
3. Accounts & dashboard. ✅
4. Revisions, sharing, expiration, import/export. ✅
5. Vanity slugs & SEO tool. ✅
6. Rich editor features (outline, templates, zen mode, bubble menu, QR). ✅
7. Full offline & sync engine. ✅
8. AI assistant (BYOK Gemini). ✅
9. Admin surface (decoy + secret-path panel). ✅
10. Polish, security hardening, self-hosting. ✅

Intentionally deferred: CAPTCHA integration (a clean seam exists), Playwright E2E suites, attachments beyond social images, the scheduled cleanup job (design in `docs/scheduled-cleanup.md`).

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Keep contributions MIT licensed and free of secrets.

## License

[MIT](./LICENSE)

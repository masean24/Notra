# OpenNotepad

A full-featured, open-source notepad studio. MIT licensed, 100% free, forever — no paywalls, no ads, no tracking.

Start writing instantly with zero login, save and share notes with a link, and manage your work across devices when you choose to create an account.

> **Status:** this project is built phase by phase (see the roadmap below). Phase 1 — Foundation — is implemented. Later-phase features listed in the roadmap are not implemented yet.

## Requirements

- Node.js ≥ 20.9
- TypeScript ≥ 5.1 (pinned by `package.json`)
- A [Supabase](https://supabase.com) project (free tier is enough)

## Quick start

```bash
git clone <your-fork-url> opennotepad
cd opennotepad
npm install
cp .env.example .env.local   # then fill in your values
npm run dev
```

Open http://localhost:3000.

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com) (or self-host Supabase using [their official Docker stack](https://supabase.com/docs/guides/self-hosting)).
2. In the dashboard, copy **Project URL** and **anon public key** into `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Apply the migrations from `supabase/migrations/` in order — either with the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started):
   ```bash
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```
   or by pasting each migration file into the dashboard **SQL Editor**.
4. In **Authentication → Sign In / Up**, enable Email provider. For local development you can disable "Confirm email"; if you keep it enabled, signups receive a confirmation link that redirects to `/auth/callback`.

## Environment variables

See [`.env.example`](./.env.example) for the full annotated list. Key points:

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Supabase anon key (RLS-protected) |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only | Never exposed to the client |
| `NEXT_PUBLIC_APP_URL` | public | Canonical base URL of the app |
| `ADMIN_SECRET_PATH` | server | Secret path rewriting to `/internal-admin` (later phase) |
| `ENCRYPTION_KEY` | server-only | AES-256-GCM key for stored Gemini keys (later phase) |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | server-only | Optional Redis rate limiting (later phase) |

Never commit `.env.local`. Server-only secrets must never be referenced from client code.

## Scripts

```bash
npm run dev     # start the dev server
npm run build   # production build
npm run start   # serve the production build
npm run lint    # eslint
```

## Self-hosting

Docker-based self-hosting (a `Dockerfile` + `docker-compose.yml` running the Next.js app against a reachable Supabase backend) is delivered in a later phase, together with the full hardening pass. The app itself never re-implements Supabase services; you point the env vars at either a hosted Supabase project or a self-hosted Supabase stack.

## Roadmap

Phases from `SPEC.md`, in build order:

1. **Foundation** — Next.js 16 + TypeScript + Tailwind v4 (OKLCH) + shadcn/ui, Supabase schema (profiles/notes) + RLS migration, email/password auth, base editor at `/new`, landing page skeleton. ✅
2. Guest core loop + local drafts
3. Accounts & dashboard
4. Revisions, sharing, expiration, import/export
5. Vanity slugs & SEO tool
6. Rich editor features
7. Full offline & sync engine
8. AI assistant (BYOK Gemini)
9. Admin surface
10. Polish, security hardening, self-hosting

## Contributing

Contribution guidelines, security policy, and code of conduct files are added alongside the later phases. For now: open an issue or send a pull request — keep contributions MIT licensed and free of secrets.

## License

[MIT](./LICENSE)

# Contributing to OpenNotepad

Thanks for helping make OpenNotepad better! This project is MIT licensed, free forever, and built to stay that way: no ads, no paywalls, no tracking.

## Getting started

1. Fork and clone the repo.
2. `npm install`
3. `cp .env.example .env.local` and fill in your Supabase project values (see the [README](./README.md) "Supabase setup").
4. `npm run dev` and open http://localhost:3000.

## Ground rules

- **No fake implementations.** Features must work end-to-end against real persistence. A half-finished feature is better than a simulated one.
- **Security is non-negotiable.** Never move secrets into client code, never bypass RLS, never log user secrets (edit codes, Gemini keys), never store raw IPs.
- **Every change must pass the gates** before review:
  ```bash
  npx tsc --noEmit
  npm run lint
  npm test
  npm run build
  ```
- Keep the API envelope (`{ success, data | error }`) and the existing conventions: guest writes via `SECURITY DEFINER` RPCs, durable rate limiting, CSRF on every mutation.
- Never hijack browser-reserved keyboard shortcuts (Ctrl+N/W/T).

## Pull requests

1. Branch from `master` with a descriptive name (`feat/…`, `fix/…`).
2. Keep PRs focused; one logical change per PR.
3. Add or update tests for behavior changes. Unit tests live in `tests/unit`, integration tests in `tests/integration` (they skip automatically when Supabase env vars are absent).
4. Update the README when behavior or setup steps change.
5. Commit messages in the conventional style used by the project, e.g. `feat: …`, `fix: …`, `test: …`.

## Reporting bugs and suggesting features

Open a GitHub issue with steps to reproduce (bugs) or a concrete use case (features). For security issues, **do not open a public issue** — see [SECURITY.md](./SECURITY.md).

## Code of conduct

By participating you agree to the [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).

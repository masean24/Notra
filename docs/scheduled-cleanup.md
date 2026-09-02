# Scheduled Cleanup Job — Design (deferred implementation)

SPEC §9 requires design-only at this phase: expired and soft-deleted notes are
never hard-deleted immediately; a separate scheduled job performs permanent
deletion later. This document is that design. It is intentionally **not**
implemented yet.

## What the job removes

1. Notes whose `expires_at < now() - GRACE_PERIOD` (default grace: 30 days).
2. Notes with `deleted_at < now() - GRACE_PERIOD` (trash purge after 30 days).
3. Orphaned edit sessions and expired share tokens older than the grace
   period.

## How it runs

- A Postgres function `cleanup_expired_notes(p_grace_interval interval)` in a
  later migration selects matching rows and deletes them (cascades remove
  revisions, sessions, shares, unlock attempts).
- On Vercel, a Cron Job (`vercel.json` → `/api/cron/cleanup`, protected by a
  `CRON_SECRET` header) calls a route handler that invokes the function with
  the service-role client. On self-hosted Docker, the same endpoint can be
  triggered by any scheduler (system cron, systemd timer, etc.).

## Guarantees

- Only data past the grace period is removed — a recently expired note can
  still be un-expired by the owner while the grace window is open.
- The job logs only counts (notes removed, sessions removed) — no note
  content, no user identifiers.
- Idempotent and safe to run concurrently (single `delete ... where` per
  category).

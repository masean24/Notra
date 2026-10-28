-- ============================================================================
-- Notra — Migration 0009: Scheduled cleanup job (SPEC §9 / Roadmap)
--
-- Adds:
--   * cleanup_expired_notes(interval): permanently purges soft-deleted notes
--     and expired notes older than the specified grace period (default 30 days),
--     plus orphaned edit sessions and expired share links.
--
-- Security model:
--   * SECURITY DEFINER function.
--   * Revoked from public and anon; granted only to service_role / postgres.
--   * Executed via authenticated cron endpoints (/api/cron/cleanup with CRON_SECRET).
-- ============================================================================

create or replace function public.cleanup_expired_notes(
  p_grace_interval interval default interval '30 days'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cutoff timestamptz := now() - coalesce(p_grace_interval, interval '30 days');
  v_notes_count integer := 0;
  v_sessions_count integer := 0;
  v_shares_count integer := 0;
begin
  -- 1. Hard delete notes past grace period (cascades remove note_revisions, sessions, shares)
  delete from public.notes
  where (deleted_at is not null and deleted_at < v_cutoff)
     or (expires_at is not null and expires_at < v_cutoff);
  get diagnostics v_notes_count = row_count;

  -- 2. Clean up any remaining expired or revoked edit sessions past grace period
  delete from public.edit_sessions
  where (revoked_at is not null and revoked_at < v_cutoff)
     or (expires_at < v_cutoff);
  get diagnostics v_sessions_count = row_count;

  -- 3. Clean up any remaining expired or revoked share links past grace period
  delete from public.note_shares
  where (revoked_at is not null and revoked_at < v_cutoff)
     or (expires_at < v_cutoff);
  get diagnostics v_shares_count = row_count;

  return jsonb_build_object(
    'status', 'ok',
    'cutoff', v_cutoff,
    'deleted_notes', v_notes_count,
    'deleted_sessions', v_sessions_count,
    'deleted_shares', v_shares_count
  );
end;
$$;

revoke all on function public.cleanup_expired_notes(interval) from public, anon;
grant execute on function public.cleanup_expired_notes(interval) to service_role;

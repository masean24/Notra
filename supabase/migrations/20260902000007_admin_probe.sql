-- ============================================================================
-- OpenNotepad — Migration 0008: admin probe log (Phase 9)
--
-- Durable record of visits to the /admin decoy: hashed IP + requested path.
-- Written by SECURITY DEFINER log_admin_probe (anon-executable, self-bounded
-- to 100 rows per IP per hour so it cannot be spammed into unbounded growth).
-- No client select grant anywhere — the admin panel reads it through the
-- admin-only RLS policy below.
-- ============================================================================

create table public.admin_probe_log (
  id uuid primary key default gen_random_uuid(),
  ip_hash text not null,
  path text not null,
  created_at timestamptz not null default now()
);

create index admin_probe_log_created_idx on public.admin_probe_log (created_at desc);

alter table public.admin_probe_log enable row level security;
revoke all on public.admin_probe_log from anon, authenticated;

create or replace function public.log_admin_probe(
  p_ip_hash text,
  p_path text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_ip_hash is null or char_length(p_ip_hash) = 0
    or char_length(p_ip_hash) > 128 then
    return;
  end if;

  -- Self-bounded: at most 100 probe rows per hashed IP per hour, so a
  -- direct RPC caller cannot inflate the table.
  if (
    select count(*) from public.admin_probe_log
    where ip_hash = p_ip_hash and created_at > now() - interval '1 hour'
  ) >= 100 then
    return;
  end if;

  insert into public.admin_probe_log (ip_hash, path)
  values (p_ip_hash, coalesce(nullif(left(p_path, 200), ''), '/admin'));
end;
$$;

-- Admin-only readback (policy re-checks profiles.is_admin, same as the
-- audit log). Writes happen only inside the SECURITY DEFINER function.
create policy "admin_probe_log_select_admin"
  on public.admin_probe_log for select to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );
grant select on public.admin_probe_log to authenticated;
grant execute on function public.log_admin_probe(text, text) to anon, authenticated;

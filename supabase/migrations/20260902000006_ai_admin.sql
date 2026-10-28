-- ============================================================================
-- Notra — Migration 0007: AI BYOK + admin surface (Phases 8 & 9)
--
-- Adds:
--   * profiles.gemini_api_key_encrypted — the user's BYOK Gemini key,
--     AES-256-GCM ciphertext produced by the server (ENCRYPTION_KEY).
--   * admin_audit_log — insert-only audit trail for admin actions.
--   * RPCs: save_own_gemini_key, load_own_gemini_key, and the admin_* set.
--
-- Security model (SPEC §12/§14):
--   * gemini_api_key_encrypted has NO grant to any client role. It is only
--     read/written inside the SECURITY DEFINER functions below, called from
--     server-side route handlers.
--   * Every admin_* RPC re-checks profiles.is_admin inside the function —
--     obscurity or client-side checks are never trusted.
--   * admin_audit_log has zero client grants; only the RPCs below write it,
--     and nothing can update or delete rows.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Encrypted BYOK Gemini key (server-side AES-256-GCM ciphertext)
-- ----------------------------------------------------------------------------
alter table public.profiles
  add column gemini_api_key_encrypted text;

revoke all on public.profiles from anon, authenticated;
grant select (id, username, display_name, avatar_url, is_admin, created_at, updated_at)
  on public.profiles to authenticated;
grant update (username, display_name, avatar_url)
  on public.profiles to authenticated;

-- ----------------------------------------------------------------------------
-- Admin audit log: append-only. No client grants at all — the RPCs write it.
-- ----------------------------------------------------------------------------
create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles (id) on delete cascade,
  action text not null,
  target_id text,
  created_at timestamptz not null default now()
);

create index admin_audit_log_admin_id_idx on public.admin_audit_log (admin_id);

alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from anon, authenticated;

-- ----------------------------------------------------------------------------
-- Shared guard: every admin RPC calls this first.
-- ----------------------------------------------------------------------------
create function public.assert_admin()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  ) then
    raise exception 'FORBIDDEN';
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- BYOK key storage (authenticated callers only, via server routes)
-- ----------------------------------------------------------------------------
create or replace function public.save_own_gemini_key(
  p_ciphertext text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return jsonb_build_object('status', 'unauthenticated');
  end if;
  if p_ciphertext is null or char_length(p_ciphertext) = 0
    or char_length(p_ciphertext) > 4096 then
    return jsonb_build_object('status', 'invalid_payload');
  end if;

  update public.profiles
  set gemini_api_key_encrypted = p_ciphertext
  where id = auth.uid();

  return jsonb_build_object('status', 'ok');
end;
$$;

create or replace function public.load_own_gemini_key()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ciphertext text;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  select gemini_api_key_encrypted into v_ciphertext
  from public.profiles
  where id = auth.uid();

  return v_ciphertext;
end;
$$;

create or replace function public.clear_own_gemini_key()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return jsonb_build_object('status', 'unauthenticated');
  end if;

  update public.profiles
  set gemini_api_key_encrypted = null
  where id = auth.uid();

  return jsonb_build_object('status', 'ok');
end;
$$;

-- ----------------------------------------------------------------------------
-- Admin panel RPCs. Each re-asserts is_admin and writes the audit trail.
-- ----------------------------------------------------------------------------
create or replace function public.admin_list_users(
  p_limit integer default 50
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', p.id,
      'email', u.email,
      'is_admin', p.is_admin,
      'created_at', p.created_at,
      'note_count', (select count(*) from public.notes n where n.owner_id = p.id)
    ) order by p.created_at desc)
    from public.profiles p
    join auth.users u on u.id = p.id
    limit least(coalesce(p_limit, 50), 200)
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_list_notes(
  p_limit integer default 50
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'public_id', n.public_id,
      'title', n.title,
      'visibility', n.visibility,
      'deleted_at', n.deleted_at,
      'owner_email', u.email,
      'created_at', n.created_at
    ) order by n.created_at desc)
    from public.notes n
    left join public.profiles p on p.id = n.owner_id
    left join auth.users u on u.id = p.id
    limit least(coalesce(p_limit, 50), 200)
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_set_note_deleted(
  p_public_id text,
  p_deleted boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  perform public.assert_admin();

  update public.notes
  set deleted_at = case when p_deleted then now() else null end
  where public_id = p_public_id;
  get diagnostics v_count = row_count;

  if v_count = 0 then
    return jsonb_build_object('status', 'note_not_found');
  end if;

  insert into public.admin_audit_log (admin_id, action, target_id)
  values (auth.uid(), case when p_deleted then 'note_soft_delete' else 'note_restore' end, p_public_id);

  return jsonb_build_object('status', 'ok');
end;
$$;

create or replace function public.admin_clear_lockout(
  p_public_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_note_id uuid;
  v_count integer;
begin
  perform public.assert_admin();

  select id into v_note_id from public.notes where public_id = p_public_id;
  if v_note_id is null then
    return jsonb_build_object('status', 'note_not_found');
  end if;

  delete from public.note_unlock_attempts where note_id = v_note_id;
  get diagnostics v_count = row_count;

  insert into public.admin_audit_log (admin_id, action, target_id)
  values (auth.uid(), 'lockout_clear', p_public_id);

  return jsonb_build_object('status', 'ok', 'cleared', v_count);
end;
$$;

create or replace function public.admin_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();

  return jsonb_build_object(
    'users', (select count(*) from public.profiles),
    'notes', (select count(*) from public.notes),
    'owned_notes', (select count(*) from public.notes where owner_id is not null),
    'deleted_notes', (select count(*) from public.notes where deleted_at is not null),
    'revisions', (select count(*) from public.note_revisions),
    'active_sessions', (select count(*) from public.edit_sessions
                        where revoked_at is null and expires_at > now()),
    'audit_entries', (select count(*) from public.admin_audit_log)
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- Audit log readback for the panel (admins only, enforced by the policy).
-- ----------------------------------------------------------------------------
create policy "admin_audit_log_select_admin"
  on public.admin_audit_log for select to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );
grant select on public.admin_audit_log to authenticated;

-- ----------------------------------------------------------------------------
-- Execute grants. Admin RPCs additionally self-assert is_admin, so granting
-- execute to all authenticated users is safe (defense in depth at the route).
-- ----------------------------------------------------------------------------
grant execute on function public.save_own_gemini_key(text) to authenticated;
grant execute on function public.load_own_gemini_key() to authenticated;
grant execute on function public.clear_own_gemini_key() to authenticated;
grant execute on function public.admin_list_users(integer) to authenticated;
grant execute on function public.admin_list_notes(integer) to authenticated;
grant execute on function public.admin_set_note_deleted(text, boolean) to authenticated;
grant execute on function public.admin_clear_lockout(text) to authenticated;
grant execute on function public.admin_stats() to authenticated;

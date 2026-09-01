-- ============================================================================
-- OpenNotepad — Migration 0002: Guest core loop (Phase 2)
--
-- Adds:
--   * pgcrypto extension (bcrypt edit-code hashing, SHA-256 token hashing)
--   * Tables: note_revisions, edit_sessions, note_unlock_attempts, rate_limits
--   * SECURITY DEFINER RPCs: create_guest_note, save_note, verify_edit_code,
--     check_edit_session, revoke_edit_session, consume_rate_limit
--
-- Security model:
--   * The anonymous role keeps NO direct write grants on `notes` (Migration 1).
--     All guest writes go through the SECURITY DEFINER RPCs below, called from
--     server-side route handlers only.
--   * Raw edit codes are never stored — only bcrypt hashes computed inside
--     Postgres. Raw session tokens are never stored — only SHA-256 hashes.
--   * note_revisions, edit_sessions, note_unlock_attempts and rate_limits have
--     RLS enabled and NO policies: they are unreachable for client roles;
--     every read/write happens inside SECURITY DEFINER functions.
-- ============================================================================

-- pgcrypto lives in the `extensions` schema on Supabase; every call below is
-- schema-qualified (extensions.crypt, extensions.digest, ...) so it works
-- regardless of the session search_path. digest() takes a bytea, hence
-- convert_to(..., 'UTF8').
create extension if not exists pgcrypto with schema extensions;

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------

create table public.note_revisions (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes (id) on delete cascade,
  revision_no integer not null,
  title text not null default '',
  content jsonb not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (note_id, revision_no)
);

create index note_revisions_note_id_idx on public.note_revisions (note_id);

create table public.edit_sessions (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index edit_sessions_note_id_idx on public.edit_sessions (note_id);

create table public.note_unlock_attempts (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes (id) on delete cascade,
  -- SHA-256 of the client IP (salted server-side). Never the raw IP.
  ip_hash text not null,
  attempt_count integer not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  unique (note_id, ip_hash)
);

-- Durable rate-limit store (Section 17). One row per rate-limit key; the
-- consume_rate_limit function performs the atomic windowed upsert.
create table public.rate_limits (
  key text primary key,
  count integer not null default 0,
  window_start timestamptz not null default now()
);

-- Lock everything down: RLS on, zero policies, zero grants. Only the
-- SECURITY DEFINER functions touch these tables.
alter table public.note_revisions enable row level security;
alter table public.edit_sessions enable row level security;
alter table public.note_unlock_attempts enable row level security;
alter table public.rate_limits enable row level security;

revoke all on public.note_revisions from anon, authenticated;
revoke all on public.edit_sessions from anon, authenticated;
revoke all on public.note_unlock_attempts from anon, authenticated;
revoke all on public.rate_limits from anon, authenticated;

-- ----------------------------------------------------------------------------
-- Shared validation constants
-- ----------------------------------------------------------------------------

-- Max serialized note content: 1 MB. Max title: 200 chars.
create function public.assert_note_payload(
  p_title text,
  p_content jsonb,
  p_content_format text
) returns void
language plpgsql
as $$
begin
  if p_content_format not in ('tiptap_json', 'markdown', 'plain_text') then
    raise exception 'INVALID_CONTENT_FORMAT';
  end if;
  if octet_length(p_content::text) > 1048576 then
    raise exception 'NOTE_TOO_LARGE';
  end if;
  if char_length(coalesce(p_title, '')) > 200 then
    raise exception 'TITLE_TOO_LONG';
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- create_guest_note: atomic guest note creation with public_id collision retry
-- ----------------------------------------------------------------------------
create or replace function public.create_guest_note(
  p_title text,
  p_content jsonb,
  p_content_format text,
  p_editing_policy text,
  p_edit_code text,
  p_expires_at timestamptz,
  p_visibility text default 'public'
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_public_id text;
  v_edit_code_hash text;
  v_alphabet text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  v_bytes bytea;
  v_attempts integer := 0;
begin
  if p_editing_policy not in ('edit_code', 'account', 'read_only') then
    raise exception 'INVALID_EDITING_POLICY';
  end if;
  if p_visibility not in ('public', 'private') then
    raise exception 'INVALID_VISIBILITY';
  end if;

  perform public.assert_note_payload(p_title, p_content, p_content_format);

  if p_editing_policy = 'edit_code' then
    if p_edit_code is null
      or char_length(p_edit_code) < 6
      or char_length(p_edit_code) > 64
      or p_edit_code ~ '\s' then
      raise exception 'INVALID_EDIT_CODE';
    end if;
    -- bcrypt inside Postgres; the raw code is never stored.
    v_edit_code_hash := extensions.crypt(p_edit_code, extensions.gen_salt('bf', 12));
  end if;

  loop
    v_attempts := v_attempts + 1;
    if v_attempts > 10 then
      raise exception 'PUBLIC_ID_GENERATION_FAILED';
    end if;

    begin
      -- 7 characters from a CSPRNG (gen_random_bytes), never sequential.
      v_bytes := extensions.gen_random_bytes(7);
      v_public_id := '';
      for i in 1 .. 7 loop
        v_public_id := v_public_id
          || substr(v_alphabet, 1 + (get_byte(v_bytes, i - 1) % 58)::int, 1);
      end loop;

      insert into public.notes (
        public_id, owner_id, title, content, content_format,
        edit_code_hash, visibility, editing_policy, expires_at, revision_no
      ) values (
        v_public_id, null, coalesce(p_title, ''), p_content, p_content_format,
        v_edit_code_hash, p_visibility, p_editing_policy, p_expires_at, 0
      );

      return v_public_id;
    exception when unique_violation then
      -- public_id collision: retry with a fresh random id.
      continue;
    end;
  end loop;
end;
$$;

-- ----------------------------------------------------------------------------
-- save_note: authorized save; increments revision and snapshots content
-- ----------------------------------------------------------------------------
create or replace function public.save_note(
  p_public_id text,
  p_title text,
  p_content jsonb,
  p_content_format text,
  p_token text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_note public.notes%rowtype;
  v_token_hash text;
  v_is_owner boolean;
  v_new_revision integer;
begin
  perform public.assert_note_payload(p_title, p_content, p_content_format);

  select * into v_note from public.notes where public_id = p_public_id;
  if not found or v_note.deleted_at is not null then
    raise exception 'NOTE_NOT_FOUND';
  end if;
  if v_note.expires_at is not null and v_note.expires_at <= now() then
    raise exception 'NOTE_EXPIRED';
  end if;

  v_is_owner := v_note.owner_id is not null and auth.uid() = v_note.owner_id;

  if not v_is_owner then
    if v_note.editing_policy = 'read_only' then
      raise exception 'NOTE_READ_ONLY';
    end if;
    if v_note.editing_policy = 'account' then
      raise exception 'EDIT_SESSION_REQUIRED';
    end if;
    -- edit_code policy: a valid, live edit session is required.
    if p_token is null then
      raise exception 'EDIT_SESSION_REQUIRED';
    end if;
    v_token_hash := encode(extensions.digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex');
    if not exists (
      select 1 from public.edit_sessions
      where note_id = v_note.id
        and token_hash = v_token_hash
        and revoked_at is null
        and expires_at > now()
    ) then
      raise exception 'EDIT_SESSION_EXPIRED';
    end if;
  end if;

  v_new_revision := v_note.revision_no + 1;

  update public.notes
  set title = p_title,
      content = p_content,
      content_format = p_content_format,
      revision_no = v_new_revision
  where id = v_note.id;

  insert into public.note_revisions (note_id, revision_no, title, content, created_by)
  values (v_note.id, v_new_revision, p_title, p_content, auth.uid());

  return v_new_revision;
end;
$$;

-- ----------------------------------------------------------------------------
-- verify_edit_code: bcrypt check + lockout counters; issues an edit session
-- ----------------------------------------------------------------------------
create or replace function public.verify_edit_code(
  p_public_id text,
  p_code text,
  p_token text,
  p_ip_hash text
)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_note public.notes%rowtype;
  v_attempt public.note_unlock_attempts%rowtype;
  v_session_expires timestamptz;
begin
  select * into v_note from public.notes where public_id = p_public_id;
  if not found or v_note.deleted_at is not null then
    raise exception 'NOTE_NOT_FOUND';
  end if;

  -- Only notes with an edit code can be unlocked. Same error for a wrong
  -- code and a note without one — no information leak either way.
  if v_note.editing_policy <> 'edit_code' or v_note.edit_code_hash is null then
    raise exception 'INVALID_EDIT_CODE';
  end if;

  select * into v_attempt
  from public.note_unlock_attempts
  where note_id = v_note.id and ip_hash = p_ip_hash;

  if found
    and v_attempt.locked_until is not null
    and v_attempt.locked_until > now() then
    raise exception 'EDIT_LOCKED';
  end if;

  if extensions.crypt(p_code, v_note.edit_code_hash) <> v_note.edit_code_hash then
    if found then
      update public.note_unlock_attempts
      set attempt_count = case
            when v_attempt.attempt_count + 1 >= 8 then 0
            else v_attempt.attempt_count + 1
          end,
          locked_until = case
            when v_attempt.attempt_count + 1 >= 8
              then now() + interval '15 minutes'
            else v_attempt.locked_until
          end
      where note_id = v_note.id and ip_hash = p_ip_hash;
    else
      insert into public.note_unlock_attempts (note_id, ip_hash, attempt_count)
      values (v_note.id, p_ip_hash, 1);
    end if;
    raise exception 'INVALID_EDIT_CODE';
  end if;

  -- Correct code: clear failure counters and mint a session. Only the
  -- SHA-256 hash of the opaque token is stored.
  delete from public.note_unlock_attempts
  where note_id = v_note.id and ip_hash = p_ip_hash;

  insert into public.edit_sessions (note_id, token_hash, expires_at)
  values (
    v_note.id,
    encode(extensions.digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex'),
    now() + interval '30 minutes'
  )
  returning expires_at into v_session_expires;

  return v_session_expires;
end;
$$;

-- ----------------------------------------------------------------------------
-- check_edit_session: does this token hold a live edit session for the note?
-- ----------------------------------------------------------------------------
create or replace function public.check_edit_session(
  p_public_id text,
  p_token text
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.edit_sessions s
    join public.notes n on n.id = s.note_id
    where n.public_id = p_public_id
      and s.token_hash = encode(extensions.digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex')
      and s.revoked_at is null
      and s.expires_at > now()
      and n.deleted_at is null
  )
$$;

-- ----------------------------------------------------------------------------
-- revoke_edit_session: explicit revocation ("lock editing again")
-- ----------------------------------------------------------------------------
create or replace function public.revoke_edit_session(
  p_public_id text,
  p_token text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.edit_sessions s
  set revoked_at = now()
  from public.notes n
  where s.note_id = n.id
    and n.public_id = p_public_id
    and s.token_hash = encode(extensions.digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex')
    and s.revoked_at is null;
  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;

-- ----------------------------------------------------------------------------
-- consume_rate_limit: atomic windowed counter (Section 17 — durable store)
-- ----------------------------------------------------------------------------
create or replace function public.consume_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language sql
security definer
set search_path = public
as $$
  with ins as (
    insert into public.rate_limits (key, count, window_start)
    values (p_key, 1, now())
    on conflict (key) do update
      set count = case
            when public.rate_limits.window_start
              < now() - make_interval(secs => p_window_seconds)
            then 1
            else public.rate_limits.count + 1
          end,
          window_start = case
            when public.rate_limits.window_start
              < now() - make_interval(secs => p_window_seconds)
            then now()
            else public.rate_limits.window_start
          end
    returning public.rate_limits.count
  )
  select (select count from ins) <= p_limit
$$;

-- ----------------------------------------------------------------------------
-- Execute grants: these RPCs are called exclusively from server-side route
-- handlers, using the anon/authenticated key. Direct table access stays
-- impossible for client roles.
-- ----------------------------------------------------------------------------
grant execute on function public.create_guest_note(text, jsonb, text, text, text, timestamptz, text) to anon, authenticated;
grant execute on function public.save_note(text, text, jsonb, text, text) to anon, authenticated;
grant execute on function public.verify_edit_code(text, text, text, text) to anon, authenticated;
grant execute on function public.check_edit_session(text, text) to anon, authenticated;
grant execute on function public.revoke_edit_session(text, text) to anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to anon, authenticated;

-- ============================================================================
-- OpenNotepad — Migration 0005: Revisions, sharing, expiration (Phase 4)
--
-- Adds:
--   * note_shares table (opaque share tokens, SHA-256 hashed at rest)
--   * Owner RLS read access to note_revisions (for the history UI)
--   * RPCs: restore_revision, create_share_link, list_share_links,
--     revoke_share_link, get_public_note, redeem_share
--
-- Security model:
--   * note_shares keeps RLS enabled with zero grants — only the SECURITY
--     DEFINER functions below touch it. Raw share tokens are never stored;
--     only their SHA-256 hashes.
--   * get_public_note exists so the app can distinguish "expired" from
--     "missing" for the public expiration page (SPEC §9/§21) WITHOUT opening
--     a broader table grant: it returns only public, non-deleted notes, and
--     marks private notes as not_found.
--   * redeem_share grants scoped access via a valid token only; edit
--     permission mints a regular 30-minute edit session internally.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- note_shares: additional share links with their own permission + TTL
-- ----------------------------------------------------------------------------
create table public.note_shares (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes (id) on delete cascade,
  -- SHA-256 of the opaque share token. The raw token appears only once, in
  -- the minted URL.
  token_hash text not null unique,
  permission text not null check (permission in ('view', 'edit')),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index note_shares_note_id_idx on public.note_shares (note_id);

alter table public.note_shares enable row level security;
revoke all on public.note_shares from anon, authenticated;

-- ----------------------------------------------------------------------------
-- Owners may read their own revisions (history UI). Writes stay inside
-- SECURITY DEFINER functions.
-- ----------------------------------------------------------------------------
grant select on public.note_revisions to authenticated;

create policy "note_revisions_select_own"
  on public.note_revisions for select to authenticated
  using (
    exists (
      select 1 from public.notes
      where notes.id = note_revisions.note_id
        and notes.owner_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- restore_revision: roll a note back to a past revision. The rollback itself
-- becomes a NEW revision so history is never rewritten.
-- ----------------------------------------------------------------------------
create or replace function public.restore_revision(
  p_public_id text,
  p_revision_no integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_note public.notes%rowtype;
  v_revision public.note_revisions%rowtype;
  v_new_revision integer;
begin
  select * into v_note from public.notes where public_id = p_public_id;
  if not found or v_note.deleted_at is not null
    or v_note.owner_id is null or v_note.owner_id <> auth.uid() then
    raise exception 'NOTE_NOT_FOUND';
  end if;

  select * into v_revision
  from public.note_revisions
  where note_id = v_note.id and revision_no = p_revision_no;
  if not found then
    raise exception 'REVISION_NOT_FOUND';
  end if;

  v_new_revision := v_note.revision_no + 1;

  update public.notes
  set title = v_revision.title,
      content = v_revision.content,
      revision_no = v_new_revision
  where id = v_note.id;

  insert into public.note_revisions (note_id, revision_no, title, content, created_by)
  values (v_note.id, v_new_revision, v_revision.title, v_revision.content, auth.uid());

  return v_new_revision;
end;
$$;

-- ----------------------------------------------------------------------------
-- create_share_link: mint an opaque share token. Returns the RAW token once;
-- only its SHA-256 hash is stored.
-- ----------------------------------------------------------------------------
create or replace function public.create_share_link(
  p_public_id text,
  p_permission text,
  p_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_note public.notes%rowtype;
  v_token text;
  v_share_id uuid;
begin
  if p_permission not in ('view', 'edit') then
    raise exception 'INVALID_SHARE_PERMISSION';
  end if;
  if p_expires_at is null or p_expires_at <= now() then
    raise exception 'INVALID_SHARE_EXPIRY';
  end if;

  select * into v_note from public.notes where public_id = p_public_id;
  if not found or v_note.deleted_at is not null
    or v_note.owner_id is null or v_note.owner_id <> auth.uid() then
    raise exception 'NOTE_NOT_FOUND';
  end if;

  -- 256-bit CSPRNG token; stored hashed only.
  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.note_shares (note_id, token_hash, permission, expires_at)
  values (
    v_note.id,
    encode(extensions.digest(convert_to(v_token, 'UTF8'), 'sha256'), 'hex'),
    p_permission,
    p_expires_at
  )
  returning id into v_share_id;

  return jsonb_build_object(
    'share_id', v_share_id,
    'token', v_token,
    'permission', p_permission,
    'expires_at', p_expires_at
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- list_share_links: metadata only — never the raw token or its hash.
-- ----------------------------------------------------------------------------
create or replace function public.list_share_links(
  p_public_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_note public.notes%rowtype;
  v_shares jsonb;
begin
  select * into v_note from public.notes where public_id = p_public_id;
  if not found or v_note.owner_id is null or v_note.owner_id <> auth.uid() then
    raise exception 'NOTE_NOT_FOUND';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', s.id,
    'permission', s.permission,
    'expires_at', s.expires_at,
    'revoked_at', s.revoked_at,
    'created_at', s.created_at
  ) order by s.created_at desc), '[]'::jsonb)
  into v_shares
  from public.note_shares s
  where s.note_id = v_note.id;

  return v_shares;
end;
$$;

-- ----------------------------------------------------------------------------
-- revoke_share_link: revoke by share id (owner-only).
-- ----------------------------------------------------------------------------
create or replace function public.revoke_share_link(
  p_public_id text,
  p_share_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_note public.notes%rowtype;
  v_count integer;
begin
  select * into v_note from public.notes where public_id = p_public_id;
  if not found or v_note.owner_id is null or v_note.owner_id <> auth.uid() then
    raise exception 'NOTE_NOT_FOUND';
  end if;

  update public.note_shares
  set revoked_at = now()
  where id = p_share_id and note_id = v_note.id and revoked_at is null;
  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;

-- ----------------------------------------------------------------------------
-- get_public_note: public view payload with an honest expired status so the
-- UI can show a real expiration page (SPEC §9) while private and missing
-- notes stay indistinguishable (both "not_found").
-- ----------------------------------------------------------------------------
create or replace function public.get_public_note(
  p_public_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_note public.notes%rowtype;
begin
  select * into v_note from public.notes where public_id = p_public_id;
  if not found or v_note.deleted_at is not null
    or v_note.visibility <> 'public' then
    return jsonb_build_object('status', 'not_found');
  end if;
  if v_note.expires_at is not null and v_note.expires_at <= now() then
    return jsonb_build_object('status', 'expired', 'expires_at', v_note.expires_at);
  end if;

  return jsonb_build_object(
    'status', 'ok',
    'public_id', v_note.public_id,
    'title', v_note.title,
    'content', v_note.content,
    'content_format', v_note.content_format,
    'created_at', v_note.created_at,
    'updated_at', v_note.updated_at
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- redeem_share: validate a share token and grant its scoped access.
--   * view → returns the note payload (works for private notes too)
--   * edit → additionally mints a regular 30-minute edit session
-- Missing, deleted, expired notes and bad/revoked/expired tokens all map to
-- 'not_found' — a leaked share URL confirms nothing (SPEC §3).
-- ----------------------------------------------------------------------------
create or replace function public.redeem_share(
  p_token text,
  p_session_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_share public.note_shares%rowtype;
  v_note public.notes%rowtype;
  v_session_expires timestamptz;
begin
  select * into v_share
  from public.note_shares
  where token_hash = encode(extensions.digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex')
  limit 1;

  if not found or v_share.revoked_at is not null or v_share.expires_at <= now() then
    return jsonb_build_object('status', 'not_found');
  end if;

  select * into v_note from public.notes where id = v_share.note_id;
  if not found or v_note.deleted_at is not null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if v_note.expires_at is not null and v_note.expires_at <= now() then
    return jsonb_build_object('status', 'expired', 'expires_at', v_note.expires_at);
  end if;

  if v_share.permission = 'edit' then
    insert into public.edit_sessions (note_id, token_hash, expires_at)
    values (
      v_note.id,
      encode(extensions.digest(convert_to(p_session_token, 'UTF8'), 'sha256'), 'hex'),
      now() + interval '30 minutes'
    )
    returning expires_at into v_session_expires;
  end if;

  return jsonb_build_object(
    'status', 'ok',
    'permission', v_share.permission,
    'public_id', v_note.public_id,
    'title', v_note.title,
    'content', v_note.content,
    'content_format', v_note.content_format,
    'updated_at', v_note.updated_at,
    'session_expires_at', v_session_expires
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- Execute grants: called exclusively from server-side route handlers.
-- ----------------------------------------------------------------------------
grant execute on function public.restore_revision(text, integer) to authenticated;
grant execute on function public.create_share_link(text, text, timestamptz) to authenticated;
grant execute on function public.list_share_links(text) to authenticated;
grant execute on function public.revoke_share_link(text, uuid) to authenticated;
grant execute on function public.get_public_note(text) to anon, authenticated;
grant execute on function public.redeem_share(text, text) to anon, authenticated;

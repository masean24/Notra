-- ============================================================================
-- OpenNotepad — Migration 0004: Accounts & dashboard (Phase 3)
--
-- Adds:
--   * create_user_note — owned-note creation (authenticated callers only)
--   * claim_note       — claim a guest note with its link + edit code
--
-- Security model:
--   * Both functions are SECURITY DEFINER and executable by `authenticated`
--     only. The anon role can neither create owned notes nor claim.
--   * claim_note returns a JSON status object instead of raising exceptions:
--     it writes failed-attempt counters BEFORE reporting failure, and a raised
--     exception would roll those counters back (same lesson as migration
--     0003). Brute-force protection therefore actually commits.
--   * Ownership changes stay inside this function; clients keep no direct
--     UPDATE grant on notes.owner_id (column never granted).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- create_user_note: authenticated note creation with public_id collision retry
--
-- Owned notes never need an edit code (authorization via owner_id + RLS), so
-- editing_policy is always 'account' and no edit_code_hash is stored.
-- ----------------------------------------------------------------------------
create or replace function public.create_user_note(
  p_title text,
  p_content jsonb,
  p_content_format text,
  p_expires_at timestamptz,
  p_visibility text default 'public'
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
  v_public_id text;
  v_alphabet text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  v_bytes bytea;
  v_attempts integer := 0;
begin
  if v_owner is null then
    raise exception 'UNAUTHENTICATED';
  end if;
  if p_visibility not in ('public', 'private') then
    raise exception 'INVALID_VISIBILITY';
  end if;

  perform public.assert_note_payload(p_title, p_content, p_content_format);

  loop
    v_attempts := v_attempts + 1;
    if v_attempts > 10 then
      raise exception 'PUBLIC_ID_GENERATION_FAILED';
    end if;

    begin
      -- Same 7-character CSPRNG public_id as guest notes.
      v_bytes := extensions.gen_random_bytes(7);
      v_public_id := '';
      for i in 1 .. 7 loop
        v_public_id := v_public_id
          || substr(v_alphabet, 1 + (get_byte(v_bytes, i - 1) % 58)::int, 1);
      end loop;

      insert into public.notes (
        public_id, owner_id, title, content, content_format,
        visibility, editing_policy, expires_at, revision_no
      ) values (
        v_public_id, v_owner, coalesce(p_title, ''), p_content, p_content_format,
        p_visibility, 'account', p_expires_at, 0
      );

      return v_public_id;
    exception when unique_violation then
      continue;
    end;
  end loop;
end;
$$;

-- ----------------------------------------------------------------------------
-- claim_note: verify a guest note's edit code and reassign ownership.
--
-- The note and its public link are never destroyed or recreated — only
-- owner_id changes. A user's claim attempts are throttled with the same
-- 8-fails → 15-minute lockout as edit-code verification, keyed per note and
-- per claiming user (the ip_hash column doubles as the throttling key).
-- ----------------------------------------------------------------------------
create or replace function public.claim_note(
  p_public_id text,
  p_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claimer uuid := auth.uid();
  v_note public.notes%rowtype;
  v_attempt public.note_unlock_attempts%rowtype;
  v_attempt_key text;
begin
  if v_claimer is null then
    return jsonb_build_object('status', 'unauthenticated');
  end if;
  v_attempt_key := 'claim:' || v_claimer::text;

  select * into v_note from public.notes where public_id = p_public_id;
  if not found or v_note.deleted_at is not null then
    return jsonb_build_object('status', 'note_not_found');
  end if;

  -- A note already owned by someone else can no longer be claimed. Claiming
  -- your own note again is a harmless no-op that reports ok.
  if v_note.owner_id is not null and v_note.owner_id <> v_claimer then
    return jsonb_build_object('status', 'already_claimed');
  end if;

  -- Only notes with an edit code can be claimed. Same response for a wrong
  -- code and a note without one — no information leak either way.
  if v_note.editing_policy <> 'edit_code' or v_note.edit_code_hash is null then
    return jsonb_build_object('status', 'invalid_code');
  end if;

  select * into v_attempt
  from public.note_unlock_attempts
  where note_id = v_note.id and ip_hash = v_attempt_key;

  if found
    and v_attempt.locked_until is not null
    and v_attempt.locked_until > now() then
    return jsonb_build_object('status', 'locked');
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
      where note_id = v_note.id and ip_hash = v_attempt_key;
    else
      insert into public.note_unlock_attempts (note_id, ip_hash, attempt_count)
      values (v_note.id, v_attempt_key, 1);
    end if;
    return jsonb_build_object('status', 'invalid_code');
  end if;

  -- Correct code: clear failure counters and reassign ownership.
  delete from public.note_unlock_attempts
  where note_id = v_note.id and ip_hash = v_attempt_key;

  update public.notes
  set owner_id = v_claimer
  where id = v_note.id;

  return jsonb_build_object('status', 'ok', 'public_id', v_note.public_id);
end;
$$;

-- ----------------------------------------------------------------------------
-- Execute grants: authenticated callers only, always via server-side route
-- handlers. The anon role can neither create owned notes nor claim.
-- ----------------------------------------------------------------------------
revoke all on function public.create_user_note(text, jsonb, text, timestamptz, text) from anon, public;
grant execute on function public.create_user_note(text, jsonb, text, timestamptz, text) to authenticated;

revoke all on function public.claim_note(text, text) from anon, public;
grant execute on function public.claim_note(text, text) to authenticated;

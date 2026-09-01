-- ============================================================================
-- OpenNotepad — Migration 0003: verify_edit_code status-return fix
--
-- The previous version raised exceptions on invalid/locked attempts. A raised
-- exception aborts the caller's transaction, which silently rolled back the
-- attempt counter it had just written — brute-force lockout never engaged.
-- The function now returns a JSON status object instead so the counter
-- commits; the API layer maps statuses to HTTP error responses.
-- ============================================================================

drop function if exists public.verify_edit_code(text, text, text, text);

create or replace function public.verify_edit_code(
  p_public_id text,
  p_code text,
  p_token text,
  p_ip_hash text
)
returns jsonb
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
    return jsonb_build_object('status', 'note_not_found');
  end if;

  -- Only notes with an edit code can be unlocked. Same response for a wrong
  -- code and a note without one — no information leak either way.
  if v_note.editing_policy <> 'edit_code' or v_note.edit_code_hash is null then
    return jsonb_build_object('status', 'invalid_code');
  end if;

  select * into v_attempt
  from public.note_unlock_attempts
  where note_id = v_note.id and ip_hash = p_ip_hash;

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
      where note_id = v_note.id and ip_hash = p_ip_hash;
    else
      insert into public.note_unlock_attempts (note_id, ip_hash, attempt_count)
      values (v_note.id, p_ip_hash, 1);
    end if;
    return jsonb_build_object('status', 'invalid_code');
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

  return jsonb_build_object('status', 'ok', 'expires_at', v_session_expires);
end;
$$;

grant execute on function public.verify_edit_code(text, text, text, text) to anon, authenticated;

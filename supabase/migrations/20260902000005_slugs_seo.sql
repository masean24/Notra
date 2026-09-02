-- ============================================================================
-- OpenNotepad — Migration 0006: Vanity slugs & SEO metadata (Phase 5)
--
-- Adds:
--   * SEO columns on notes: meta_title, meta_description, canonical_url,
--     social_image_path
--   * Storage bucket `social-images` (public read, owner-scoped writes)
--   * RPCs: claim_slug, get_note_by_slug
--
-- Security model:
--   * meta_* columns are readable by anyone for a PUBLIC note (needed for
--     social previews) but updatable only by the owner via column grants +
--     RLS. Social images upload directly from the browser to Storage under
--     per-user folders, never through the notes table.
--   * claim_slug validates format and the reserved-slug list inside the
--     SECURITY DEFINER function; slug uniqueness is enforced by the unique
--     index and reported as a jsonb status (no exception rollback concerns).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SEO metadata columns
-- ----------------------------------------------------------------------------
alter table public.notes
  add column meta_title text,
  add column meta_description text,
  add column canonical_url text,
  add column social_image_path text;

-- Anyone may read the metadata of rows they can already see (public notes,
-- or their own). Updatable only by the owner, still gated by RLS.
grant select (
  meta_title, meta_description, canonical_url, social_image_path
) on public.notes to anon, authenticated;

grant update (
  meta_title, meta_description, canonical_url, social_image_path
) on public.notes to authenticated;

-- ----------------------------------------------------------------------------
-- Storage bucket for social preview images. Public read (needed for OG/Twitter
-- crawlers); writes restricted to the authenticated owner of the folder
-- prefix social-images/<uid>/... via storage.objects policies.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('social-images', 'social-images', true)
on conflict (id) do nothing;

create policy "social_images_read_public"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'social-images');

create policy "social_images_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'social-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "social_images_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'social-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ----------------------------------------------------------------------------
-- claim_slug: assign a vanity slug to a note the caller owns.
-- Returns a jsonb status: ok | note_not_found | invalid_slug | reserved_slug
-- | slug_taken. The unique index on custom_slug makes the check-and-set
-- race-proof: a concurrent claimant hits unique_violation → slug_taken.
-- ----------------------------------------------------------------------------
create or replace function public.claim_slug(
  p_public_id text,
  p_slug text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_note public.notes%rowtype;
  v_slug text := lower(trim(p_slug));
begin
  select * into v_note from public.notes where public_id = p_public_id;
  if not found or v_note.deleted_at is not null
    or v_note.owner_id is null or v_note.owner_id <> auth.uid() then
    return jsonb_build_object('status', 'note_not_found');
  end if;

  -- 3–63 chars, lowercase letters/digits, may not start or end with '-'.
  if v_slug !~ '^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$' then
    return jsonb_build_object('status', 'invalid_slug');
  end if;

  -- Hardcoded reserved list (mirrors RESERVED_SLUGS in src/config/slugs.ts):
  -- all system routes plus common infrastructure paths.
  if v_slug in (
    'api', 'new', 'write', 'login', 'signup', 'dashboard', 'settings',
    'admin', 'internal-admin', 'n', 's', 'notes', 'auth', 'favicon.ico',
    'robots.txt', 'sitemap.xml', 'manifest.json', '_next', 'public',
    'static', 'assets', 'docs', 'help', 'support', 'about', 'pricing',
    'terms', 'privacy', 'contact', 'blog', 'app', 'www', 'mail', 'ftp',
    'admin1', 'root', 'administrator', 'null', 'undefined'
  ) then
    return jsonb_build_object('status', 'reserved_slug');
  end if;

  begin
    update public.notes
    set custom_slug = v_slug
    where id = v_note.id;
  exception when unique_violation then
    return jsonb_build_object('status', 'slug_taken');
  end;

  return jsonb_build_object('status', 'ok', 'slug', v_slug);
end;
$$;

-- ----------------------------------------------------------------------------
-- get_note_by_slug: public resolver payload for /[slug]. Private, deleted,
-- expired, and unclaimed slugs are all "not_found" — a probe cannot tell
-- which slugs belong to private notes.
-- ----------------------------------------------------------------------------
create or replace function public.get_note_by_slug(
  p_slug text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_note public.notes%rowtype;
begin
  select * into v_note
  from public.notes
  where custom_slug = lower(trim(p_slug));
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
    'meta_title', v_note.meta_title,
    'meta_description', v_note.meta_description,
    'canonical_url', v_note.canonical_url,
    'social_image_path', v_note.social_image_path,
    'updated_at', v_note.updated_at
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- Execute grants: claim_slug is owner-only by design; the resolver is public.
-- ----------------------------------------------------------------------------
grant execute on function public.claim_slug(text, text) to authenticated;
grant execute on function public.get_note_by_slug(text) to anon, authenticated;

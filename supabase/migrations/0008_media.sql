-- migration: 0008_media.sql
-- summary: Business media — service photos + barber avatars. Adds nullable image_path
--   columns and a PRIVATE storage bucket scoped per business via RLS on storage.objects.
-- rollback:
--   delete from storage.buckets where id = 'business-media';
--   alter table public.services drop column if exists image_path;
--   alter table public.staff_profiles drop column if exists image_path;

-- ---------- image_path columns ----------

alter table public.services       add column if not exists image_path text;
alter table public.staff_profiles add column if not exists image_path text;

-- ---------- private bucket ----------
-- Path layout is `{business_id}/{services|staff}/{uuid}.{ext}`, so foldername[1]
-- is always the owning business id. The bucket is private; reads use signed URLs.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-media',
  'business-media',
  false,
  2097152, -- 2 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------- storage RLS ----------
-- Every policy scopes objects to the caller's own business ids (reusing the
-- SECURITY DEFINER helper from 0001). A tenant can never read or write another
-- tenant's media folder.

create policy "business_media_select_own"
  on storage.objects for select
  using (
    bucket_id = 'business-media'
    and (storage.foldername(name))[1]::uuid in (select public.current_user_business_ids())
  );

create policy "business_media_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'business-media'
    and (storage.foldername(name))[1]::uuid in (select public.current_user_business_ids())
  );

create policy "business_media_update_own"
  on storage.objects for update
  using (
    bucket_id = 'business-media'
    and (storage.foldername(name))[1]::uuid in (select public.current_user_business_ids())
  )
  with check (
    bucket_id = 'business-media'
    and (storage.foldername(name))[1]::uuid in (select public.current_user_business_ids())
  );

create policy "business_media_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'business-media'
    and (storage.foldername(name))[1]::uuid in (select public.current_user_business_ids())
  );

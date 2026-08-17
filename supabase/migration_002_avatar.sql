-- Adds profile photo support. Run this once in the Supabase Dashboard SQL Editor
-- (this is additive to schema.sql, which was already applied).

alter table public.profiles add column if not exists avatar_url text;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Public bucket: anyone can view avatar images.
create policy "avatar_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

-- Each user may only write inside their own "{uid}/..." folder.
create policy "avatar_owner_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatar_owner_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatar_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

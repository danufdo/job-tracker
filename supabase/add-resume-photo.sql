-- Resume photo: a private bucket (JPEG only, 512 KB max) with one file per user at {user_id}/photo.jpg.
alter table public.resumes add column if not exists photo_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resume-photos', 'resume-photos', false, 524288, array['image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = 524288, allowed_mime_types = array['image/jpeg'];

drop policy if exists "resume photos read own" on storage.objects;
drop policy if exists "resume photos insert own" on storage.objects;
drop policy if exists "resume photos update own" on storage.objects;
drop policy if exists "resume photos delete own" on storage.objects;
create policy "resume photos read own" on storage.objects for select to authenticated
  using (bucket_id = 'resume-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "resume photos insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'resume-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "resume photos update own" on storage.objects for update to authenticated
  using (bucket_id = 'resume-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'resume-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "resume photos delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'resume-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

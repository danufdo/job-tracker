-- Resume builder: one saved CV (form data + generated PDF) per user.
create table if not exists public.resumes (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  data jsonb not null default '{}'::jsonb,
  file_path text,
  generated_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.resumes enable row level security;
drop policy if exists "own resume" on public.resumes;
create policy "own resume" on public.resumes for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Private bucket, PDFs only, 2 MB max. Files live at {user_id}/cv.pdf.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resumes', 'resumes', false, 2097152, array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 2097152, allowed_mime_types = array['application/pdf'];

drop policy if exists "resumes read own" on storage.objects;
drop policy if exists "resumes insert own" on storage.objects;
drop policy if exists "resumes update own" on storage.objects;
drop policy if exists "resumes delete own" on storage.objects;
create policy "resumes read own" on storage.objects for select to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "resumes insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "resumes update own" on storage.objects for update to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "resumes delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);

create type app_status as enum ('saved','applied','interview','offer','rejected');

create table applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  company text not null,
  role text not null,
  status app_status not null default 'applied',
  location text, url text, source text, applied_on date, notes text,
  offer_min numeric check (offer_min >= 0), offer_max numeric check (offer_max >= 0),
  offer_currency text, offer_details text,
  created_at timestamptz not null default now()
);
create index on applications (user_id, status);
create index on applications (user_id, applied_on desc);

alter table applications enable row level security;
create policy "own rows" on applications for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create or replace function public.delete_my_account()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.applications where user_id = (select auth.uid());
  delete from auth.users where id = (select auth.uid());
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- Resume builder (also available on its own as add-resumes.sql)
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

-- Resume photo (also available on its own as add-resume-photo.sql)
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

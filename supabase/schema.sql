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

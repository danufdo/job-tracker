-- Run once in the Supabase SQL editor if you already ran schema.sql
alter table applications
  add column if not exists offer_min numeric check (offer_min >= 0),
  add column if not exists offer_max numeric check (offer_max >= 0),
  add column if not exists offer_currency text,
  add column if not exists offer_details text;

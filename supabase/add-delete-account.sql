-- Run once in the Supabase SQL editor if you already ran schema.sql
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

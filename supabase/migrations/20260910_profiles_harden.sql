-- One-shot harden for an existing profiles setup (SQL Editor).
-- Fixes: SECURITY DEFINER functions callable by anon/authenticated via /rest/v1/rpc

revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon, authenticated;

do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'rls_auto_enable'
  ) then
    execute 'revoke all on function public.rls_auto_enable() from public';
    execute 'revoke all on function public.rls_auto_enable() from anon, authenticated';
  end if;
end $$;

-- Re-sync profiles from auth.users
insert into public.profiles (id, email, display_name)
select
  u.id,
  u.email,
  coalesce(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    split_part(u.email, '@', 1)
  )
from auth.users u
on conflict (id) do update
  set email = excluded.email,
      updated_at = now();

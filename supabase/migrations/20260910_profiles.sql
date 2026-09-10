-- Profiles = clear user directory in Table Editor.
-- Run / applied via MCP migration profiles_user_directory.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  auth_provider text,
  last_sign_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists auth_provider text,
  add column if not exists last_sign_in_at timestamptz;

create index if not exists profiles_plan_idx on public.profiles (plan);

comment on table public.profiles is 'App users — open this table to see signed-up accounts (email, Google, plan).';
comment on column public.profiles.email is 'Login email';
comment on column public.profiles.display_name is 'Name from Google or email prefix';
comment on column public.profiles.plan is 'Subscription plan: free or pro';
comment on column public.profiles.auth_provider is 'How they signed up: email, google, …';
comment on column public.profiles.last_sign_in_at is 'Last sign-in from Auth';

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  provider text;
begin
  select i.provider into provider
  from auth.identities i
  where i.user_id = new.id
  order by i.created_at asc
  limit 1;

  insert into public.profiles (id, email, display_name, auth_provider, last_sign_in_at)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    coalesce(provider, new.raw_app_meta_data->>'provider', 'email'),
    new.last_sign_in_at
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(public.profiles.display_name, excluded.display_name),
        auth_provider = coalesce(excluded.auth_provider, public.profiles.auth_provider),
        last_sign_in_at = coalesce(excluded.last_sign_in_at, public.profiles.last_sign_in_at),
        updated_at = now();
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

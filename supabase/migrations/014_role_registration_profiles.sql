-- Store role-specific onboarding details without changing the core users table contract.
alter table public.users
  add column if not exists profile_details jsonb not null default '{}'::jsonb;

create index if not exists users_profile_details_gin_idx on public.users using gin (profile_details);

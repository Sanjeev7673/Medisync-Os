create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  name text not null,
  role text not null check (role in ('PATIENT', 'SPECIALIST', 'HOSPITAL', 'INSURANCE', 'ADMIN')),
  organization_id uuid,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'SUSPENDED', 'DISABLED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists users_email_idx on public.users (lower(email));
create index if not exists users_org_idx on public.users (organization_id);
create index if not exists users_role_idx on public.users (role);

alter table public.users enable row level security;

-- Application authentication uses the server-only service-role client.
-- No public/browser policy is granted for this credential table.

create or replace function public.set_users_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_updated_at on public.users;
create trigger users_updated_at
before update on public.users
for each row execute function public.set_users_updated_at();

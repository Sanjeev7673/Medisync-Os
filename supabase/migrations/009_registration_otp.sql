create table if not exists public.pending_registrations (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text not null,
  password_hash text not null,
  otp_hash text not null,
  otp_expires_at timestamptz not null,
  attempts integer not null default 0 check (attempts >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pending_registrations_expires_idx on public.pending_registrations(otp_expires_at);

alter table public.pending_registrations enable row level security;

create or replace function public.set_pending_registrations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists pending_registrations_updated_at on public.pending_registrations;
create trigger pending_registrations_updated_at
before update on public.pending_registrations
for each row execute function public.set_pending_registrations_updated_at();

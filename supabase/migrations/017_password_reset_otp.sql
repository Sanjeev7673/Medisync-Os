create table if not exists public.password_reset_otps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  email text not null,
  otp_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0 check (attempts >= 0),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists password_reset_otps_user_id_idx on public.password_reset_otps(user_id);
create index if not exists password_reset_otps_expires_at_idx on public.password_reset_otps(expires_at);

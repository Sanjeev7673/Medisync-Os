alter table public.users
  add column if not exists session_version integer not null default 1;

alter table public.users
  add constraint users_session_version_positive check (session_version >= 1);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.users(id) on delete set null,
  action text not null,
  target_user_id uuid references public.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_actor_idx on public.audit_logs (actor_user_id, created_at desc);
create index if not exists audit_logs_target_idx on public.audit_logs (target_user_id, created_at desc);

alter table public.audit_logs enable row level security;

-- Audit writes are performed only by the server-side service-role client.

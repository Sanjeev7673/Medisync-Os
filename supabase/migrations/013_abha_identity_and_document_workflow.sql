-- MediSync identity + document workflow foundation
-- ABHA is a linked national health identity; MediSync ID remains the application-facing permanent identifier.

create table if not exists public.abha_identifiers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  abha_hash text not null unique,
  abha_last4 text,
  verification_status text not null default 'PENDING' check (verification_status in ('PENDING','VERIFIED','REJECTED','UNAVAILABLE')),
  verified_at timestamptz,
  verification_source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists abha_identifiers_status_idx on public.abha_identifiers(verification_status);
create index if not exists abha_identifiers_hash_idx on public.abha_identifiers(abha_hash);

alter table public.abha_identifiers enable row level security;

drop trigger if exists abha_identifiers_updated_at on public.abha_identifiers;
create or replace function public.set_abha_identifiers_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger abha_identifiers_updated_at
before update on public.abha_identifiers
for each row execute function public.set_abha_identifiers_updated_at();

alter table public.users
  add column if not exists medisync_id_source text not null default 'PLATFORM'
    check (medisync_id_source in ('PLATFORM','ABHA_VERIFIED'));

-- Workflow state is kept with the document so the patient UI can distinguish
-- uploaded, processing, completed, and failed intelligence work.
alter table public.documents
  add column if not exists processing_status text not null default 'UPLOADED'
    check (processing_status in ('UPLOADED','PROCESSING','COMPLETED','FAILED')),
  add column if not exists processing_error text,
  add column if not exists processed_at timestamptz;

create index if not exists documents_processing_status_idx on public.documents(processing_status);
create index if not exists documents_request_id_idx on public.documents(request_id);

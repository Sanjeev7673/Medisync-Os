create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Phase 2: persistent healthcare administration domain model
-- ---------------------------------------------------------------------------

create table if not exists public.hospitals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  name text not null,
  legal_name text,
  registration_number text unique,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  country text not null default 'India',
  phone text,
  email text,
  operational_status text not null default 'ACTIVE' check (operational_status in ('ACTIVE','INACTIVE','SUSPENDED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hospital_capabilities (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.hospitals(id) on delete cascade,
  specialty text,
  capability_type text not null check (capability_type in ('SPECIALTY','EQUIPMENT','SERVICE','FACILITY')),
  capability_name text not null,
  insurance_networks text[] not null default '{}',
  operational_status text not null default 'ACTIVE' check (operational_status in ('ACTIVE','INACTIVE')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (hospital_id, capability_type, capability_name)
);

create index if not exists hospital_capabilities_hospital_idx on public.hospital_capabilities(hospital_id);
create index if not exists hospital_capabilities_specialty_idx on public.hospital_capabilities(specialty);

create table if not exists public.specialists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.users(id) on delete set null,
  full_name text not null,
  specialty text not null,
  sub_specialty text,
  license_number text unique,
  license_issuer text,
  license_expires_at date,
  credential_status text not null default 'PENDING' check (credential_status in ('PENDING','VERIFIED','EXPIRED','REJECTED')),
  review_queue_status text not null default 'AVAILABLE' check (review_queue_status in ('AVAILABLE','ASSIGNED','ON_HOLD','INACTIVE')),
  profile jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.specialist_hospital_affiliations (
  specialist_id uuid not null references public.specialists(id) on delete cascade,
  hospital_id uuid not null references public.hospitals(id) on delete cascade,
  affiliation_status text not null default 'ACTIVE' check (affiliation_status in ('ACTIVE','INACTIVE','PENDING')),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (specialist_id, hospital_id)
);

create index if not exists specialist_specialty_idx on public.specialists(specialty);
create index if not exists specialist_credential_idx on public.specialists(credential_status);

create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  request_id text unique not null,
  patient_id uuid not null references public.users(id) on delete restrict,
  request_type text,
  description text not null,
  request_source text not null default 'patient_portal',
  workflow_stage text not null default 'CREATED' check (workflow_stage in ('CREATED','CLASSIFIED','SPECIALIST_REVIEW','HOSPITAL_MATCHING','REFERRAL','APPOINTMENT_PENDING','SCHEDULED','COMPLETED','REJECTED','CANCELLED')),
  document_uploaded boolean not null default false,
  ai_classification jsonb not null default '{}'::jsonb,
  ai_confidence numeric(5,4),
  ai_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists requests_patient_idx on public.requests(patient_id);
create index if not exists requests_stage_idx on public.requests(workflow_stage);
create index if not exists requests_created_idx on public.requests(created_at desc);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referral_id text unique not null,
  request_id uuid not null references public.requests(id) on delete restrict,
  hospital_id uuid not null references public.hospitals(id) on delete restrict,
  specialist_id uuid references public.specialists(id) on delete set null,
  status text not null default 'CREATED' check (status in ('CREATED','RECEIVED','UNDER_REVIEW','ACCEPTED','REJECTED','SCHEDULED','CANCELLED')),
  clinical_summary text,
  reason text,
  received_at timestamptz,
  reviewed_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists referrals_request_idx on public.referrals(request_id);
create index if not exists referrals_hospital_idx on public.referrals(hospital_id);
create index if not exists referrals_status_idx on public.referrals(status);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references public.referrals(id) on delete restrict,
  patient_id uuid not null references public.users(id) on delete restrict,
  hospital_id uuid not null references public.hospitals(id) on delete restrict,
  specialist_id uuid not null references public.specialists(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'AVAILABLE' check (status in ('AVAILABLE','HELD','BOOKED','CONFIRMED','CANCELLED','COMPLETED','NO_SHOW')),
  booking_reference text unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists appointments_specialist_time_idx on public.appointments(specialist_id, starts_at);
create index if not exists appointments_hospital_time_idx on public.appointments(hospital_id, starts_at);
create index if not exists appointments_patient_idx on public.appointments(patient_id);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.users(id) on delete restrict,
  request_id uuid references public.requests(id) on delete set null,
  referral_id uuid references public.referrals(id) on delete set null,
  storage_provider text not null default 'supabase',
  storage_bucket text not null,
  storage_path text not null,
  original_filename text not null,
  content_type text,
  file_size_bytes bigint,
  checksum_sha256 text,
  ocr_status text not null default 'PENDING' check (ocr_status in ('PENDING','PROCESSING','COMPLETED','FAILED')),
  validation_status text not null default 'PENDING' check (validation_status in ('PENDING','VALID','INVALID','REQUIRES_REVIEW')),
  ocr_text text,
  validation_log jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists documents_patient_idx on public.documents(patient_id);
create index if not exists documents_request_idx on public.documents(request_id);
create unique index if not exists documents_storage_unique_idx on public.documents(storage_bucket, storage_path);

-- Immutable audit trail. Application code should only INSERT; UPDATE/DELETE are intentionally not exposed.
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.users(id) on delete set null,
  actor_role text,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  request_id uuid references public.requests(id) on delete set null,
  previous_state jsonb,
  new_state jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_entity_idx on public.audit_logs(entity_type, entity_id, created_at desc);
create index if not exists audit_logs_actor_idx on public.audit_logs(actor_user_id, created_at desc);
create index if not exists audit_logs_request_idx on public.audit_logs(request_id, created_at desc);

-- Common timestamp trigger for mutable domain tables.
create or replace function public.set_domain_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists hospitals_updated_at on public.hospitals;
create trigger hospitals_updated_at before update on public.hospitals for each row execute function public.set_domain_updated_at();
drop trigger if exists hospital_capabilities_updated_at on public.hospital_capabilities;
create trigger hospital_capabilities_updated_at before update on public.hospital_capabilities for each row execute function public.set_domain_updated_at();
drop trigger if exists specialists_updated_at on public.specialists;
create trigger specialists_updated_at before update on public.specialists for each row execute function public.set_domain_updated_at();
drop trigger if exists requests_updated_at on public.requests;
create trigger requests_updated_at before update on public.requests for each row execute function public.set_domain_updated_at();
drop trigger if exists referrals_updated_at on public.referrals;
create trigger referrals_updated_at before update on public.referrals for each row execute function public.set_domain_updated_at();
drop trigger if exists appointments_updated_at on public.appointments;
create trigger appointments_updated_at before update on public.appointments for each row execute function public.set_domain_updated_at();
drop trigger if exists documents_updated_at on public.documents;
create trigger documents_updated_at before update on public.documents for each row execute function public.set_domain_updated_at();

alter table public.hospitals enable row level security;
alter table public.hospital_capabilities enable row level security;
alter table public.specialists enable row level security;
alter table public.specialist_hospital_affiliations enable row level security;
alter table public.requests enable row level security;
alter table public.referrals enable row level security;
alter table public.appointments enable row level security;
alter table public.documents enable row level security;
alter table public.audit_logs enable row level security;

-- All current application access goes through the server-only Supabase service-role client.
-- Browser policies can be added later when direct client access is intentionally introduced.

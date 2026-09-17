-- Keep role and onboarding fields with the OTP-pending registration until verification completes.
alter table public.pending_registrations
  add column if not exists metadata jsonb not null default '{}'::jsonb;

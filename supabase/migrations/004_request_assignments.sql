alter table public.requests
  add column if not exists assigned_specialist_id uuid;

alter table public.requests
  drop constraint if exists requests_assigned_specialist_fk;

alter table public.requests
  add constraint requests_assigned_specialist_fk
  foreign key (assigned_specialist_id)
  references public.specialists(id)
  on delete set null;

create index if not exists idx_requests_assigned_specialist
  on public.requests(assigned_specialist_id);

comment on column public.requests.assigned_specialist_id is
  'Specialist assigned to review/coordinate this request; null until assigned.';

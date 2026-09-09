create or replace function public.assign_hospital_and_create_referral_with_audit(
  p_request_db_id uuid,
  p_expected_updated_at timestamptz,
  p_referral_id text,
  p_hospital_id uuid,
  p_specialist_id uuid,
  p_clinical_summary text,
  p_reason text,
  p_actor_user_id uuid,
  p_actor_role text
) returns public.referrals
language plpgsql
security definer
set search_path=public
as $$
declare
  v_request public.requests;
  v_referral public.referrals;
  v_hospital public.hospitals;
  v_user public.users;
begin
  select * into v_request
  from public.requests
  where id = p_request_db_id
    and workflow_stage = 'HOSPITAL_MATCHING'
    and updated_at = p_expected_updated_at
  for update;

  if not found then
    raise exception 'CONCURRENT_MODIFICATION';
  end if;

  select * into v_hospital
  from public.hospitals
  where id = p_hospital_id
    and operational_status = 'ACTIVE';

  if not found then
    raise exception 'HOSPITAL_NOT_ACTIVE';
  end if;

  select * into v_user
  from public.users
  where id = p_actor_user_id
    and status = 'ACTIVE';

  if not found then
    raise exception 'FORBIDDEN';
  end if;

  if p_actor_role = 'admin' then
    null;
  elsif p_actor_role = 'hospital'
    and v_user.role = 'HOSPITAL'
    and v_user.organization_id is not null
    and v_hospital.organization_id = v_user.organization_id then
    null;
  else
    raise exception 'FORBIDDEN';
  end if;

  if not exists (
    select 1
    from public.hospital_capabilities hc
    where hc.hospital_id = p_hospital_id
      and hc.operational_status = 'ACTIVE'
      and hc.specialty = nullif(trim(coalesce(v_request.ai_classification->>'specialty', '')), '')
  ) then
    raise exception 'HOSPITAL_CAPABILITY_NOT_FOUND';
  end if;

  insert into public.referrals(
    referral_id, request_id, hospital_id, specialist_id, clinical_summary, reason
  ) values (
    p_referral_id, v_request.id, p_hospital_id, p_specialist_id, p_clinical_summary, p_reason
  ) returning * into v_referral;

  update public.requests
  set workflow_stage = 'REFERRAL'
  where id = v_request.id
    and workflow_stage = 'HOSPITAL_MATCHING'
    and updated_at = p_expected_updated_at
  returning * into v_request;

  if not found then
    raise exception 'CONCURRENT_MODIFICATION';
  end if;

  insert into public.audit_logs(
    actor_user_id, actor_role, action, entity_type, entity_id, request_id,
    previous_state, new_state, metadata
  ) values (
    p_actor_user_id, p_actor_role, 'REFERRAL_CREATED', 'referral', v_referral.id, v_request.id,
    'HOSPITAL_MATCHING', 'REFERRAL',
    jsonb_build_object(
      'referral_id', v_referral.referral_id,
      'hospital_id', v_referral.hospital_id,
      'specialist_id', v_referral.specialist_id
    )
  );

  insert into public.audit_logs(
    actor_user_id, actor_role, action, entity_type, entity_id, request_id,
    previous_state, new_state, metadata
  ) values (
    p_actor_user_id, p_actor_role, 'REQUEST_STAGE_CHANGED', 'request', v_request.id, v_request.id,
    'HOSPITAL_MATCHING', 'REFERRAL',
    jsonb_build_object('referral_id', v_referral.referral_id, 'hospital_id', v_referral.hospital_id)
  );

  return v_referral;
end;
$$;

revoke execute on function public.assign_hospital_and_create_referral_with_audit(uuid,timestamptz,text,uuid,uuid,text,text,uuid,text) from public, anon, authenticated;
grant execute on function public.assign_hospital_and_create_referral_with_audit(uuid,timestamptz,text,uuid,uuid,text,text,uuid,text) to service_role;

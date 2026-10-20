-- Business RPCs used by Edge Functions and authenticated clients

-- Default customer docs by type
create or replace function public.default_customer_docs(p_type public.project_type)
returns jsonb
language sql
immutable
as $$
  select case p_type
    when 'residential' then jsonb_build_array(
      jsonb_build_object('name', 'Electricity bill', 'status', 'Missing'),
      jsonb_build_object('name', 'Identity proof', 'status', 'Missing'),
      jsonb_build_object('name', 'Address proof', 'status', 'Missing'),
      jsonb_build_object('name', 'Property ownership proof', 'status', 'Missing'),
      jsonb_build_object('name', 'Cancelled cheque', 'status', 'Missing'),
      jsonb_build_object('name', 'Site photographs', 'status', 'Missing')
    )
    else jsonb_build_array(
      jsonb_build_object('name', 'Electricity bill', 'status', 'Missing'),
      jsonb_build_object('name', 'Business registration', 'status', 'Missing'),
      jsonb_build_object('name', 'GST certificate', 'status', 'Missing'),
      jsonb_build_object('name', 'Authorised signatory letter', 'status', 'Missing'),
      jsonb_build_object('name', 'Property ownership or lease', 'status', 'Missing'),
      jsonb_build_object('name', 'Site photographs', 'status', 'Missing')
    )
  end;
$$;

create or replace function public.default_utility_milestones(p_scheme text)
returns jsonb
language sql
stable
as $$
  select jsonb_agg(
    jsonb_build_object(
      'key', m.key,
      'status', case when p_scheme = 'none' and m.key = 'portalUpload' then 'Not applicable' else 'Not started' end,
      'date', '',
      'note', ''
    )
    order by m.ord
  )
  from (
    values
      (1, 'nmAgreement'),
      (2, 'nmApplication'),
      (3, 'nmInstall'),
      (4, 'portalUpload'),
      (5, 'inspectionRequest'),
      (6, 'inspectionResult'),
      (7, 'discom'),
      (8, 'docsShared')
  ) as m(ord, key);
$$;

-- Convert approved Won lead → project (service role / admin)
create or replace function public.convert_lead_to_project(
  p_approval_id uuid,
  p_actor uuid default auth.uid()
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.approvals%rowtype;
  l public.leads%rowtype;
  s public.schemes%rowtype;
  pid uuid;
  portal_name text;
  today_ist date := (timezone('Asia/Kolkata', now()))::date;
begin
  select * into a from public.approvals where id = p_approval_id for update;
  if not found then raise exception 'Approval not found'; end if;
  if a.type <> 'won' or a.entity <> 'lead' then raise exception 'Not a Won approval'; end if;
  if a.status <> 'approved' then raise exception 'Approval must be approved first'; end if;

  select * into l from public.leads where id = a.entity_id for update;
  if not found then raise exception 'Lead not found'; end if;
  if l.project_id is not null then return l.project_id; end if;

  select * into s from public.schemes where key = a.payload->>'scheme';
  portal_name := s.portal;

  insert into public.projects (
    lead_id, client_name, contact_name, business_name, phone, email, type, scheme,
    address, district, taluka, consumer_no, capacity_kw, project_value, won_date, source,
    owner_id, stage, substage, checklist, survey, docs, procurement, installation,
    milestones, subsidy, commissioning
  ) values (
    l.id,
    coalesce(nullif(l.business_name, ''), l.contact_name),
    l.contact_name,
    l.business_name,
    l.phone,
    l.email,
    l.type,
    a.payload->>'scheme',
    l.address,
    l.district,
    l.taluka,
    l.consumer_no,
    (a.payload->>'capacityKw')::numeric,
    coalesce((a.payload->>'value')::numeric, 0),
    today_ist,
    l.source,
    l.owner_id,
    'won',
    'Client created',
    jsonb_build_object(
      'won', jsonb_build_object(
        'proposal', coalesce((a.payload->>'proposalAccepted')::boolean, false),
        'closeEvidence', true,
        'scheme', (a.payload->>'scheme') is not null,
        'driveRoot', false
      )
    ),
    jsonb_build_object(
      'requestedAt', '', 'plannedDate', '', 'surveyor', coalesce(l.surveyor_id::text, ''),
      'completedDate', '', 'feasibility', '', 'roofType', '', 'shadow', '', 'electrical', '',
      'dcKw', (a.payload->>'capacityKw')::numeric, 'acKw', '', 'designVersion', '',
      'designStatus', 'Not started', 'exceptions', ''
    ),
    jsonb_build_object(
      'vendorAgreement', 'Not started',
      'customerDocs', public.default_customer_docs(l.type),
      'loan', jsonb_build_object('status', 'Not started', 'lender', '', 'ref', '', 'date', ''),
      'portal', case when a.payload->>'scheme' = 'none'
        then jsonb_build_object('status', 'Not applicable', 'name', '', 'ref', '', 'date', '', 'query', '')
        else jsonb_build_object('status', 'Not started', 'name', portal_name, 'ref', '', 'date', '', 'query', '')
      end
    ),
    jsonb_build_object(
      'confirmedDate', '', 'supplier', '', 'materialReady', 'Not ready', 'fabrication', '',
      'plannedInstallDate', '', 'siteReady', '', 'prerequisites', ''
    ),
    jsonb_build_object(
      'tasks', jsonb_build_array(
        jsonb_build_object('name', 'Fabrication and structure', 'assignee', '', 'planned', '', 'done', ''),
        jsonb_build_object('name', 'Earthing', 'assignee', '', 'planned', '', 'done', ''),
        jsonb_build_object('name', 'Wiring', 'assignee', '', 'planned', '', 'done', ''),
        jsonb_build_object('name', 'Testing', 'assignee', '', 'planned', '', 'done', ''),
        jsonb_build_object('name', 'Installation upload', 'assignee', '', 'planned', '', 'done', '')
      ),
      'actualDate', '', 'observations', ''
    ),
    public.default_utility_milestones(a.payload->>'scheme'),
    case when a.payload->>'scheme' = 'none' then 'Not applicable' else 'Not started' end,
    jsonb_build_object(
      'date', '', 'outcome', '', 'handoverChecklist', false,
      'warrantyStart', '', 'warrantyEnd', '', 'omStart', ''
    )
  ) returning id into pid;

  update public.leads
  set status = 'won', project_id = pid, won_at = today_ist, stage = 'sales', updated_at = timezone('utc', now())
  where id = l.id;

  insert into public.tasks (project_id, title, stage, assignee_id, due_date, priority, required, requires_drive, created_by)
  values (pid, 'Create Drive project folder', 'won', l.owner_id, today_ist, 'High', true, true, p_actor);

  perform public.log_event(
    'project', pid, 'created',
    'Project created from lead ' || l.code || '. Original source, owner and timeline kept.'
  );

  return pid;
end;
$$;

-- Move project stage with gate enforcement
create or replace function public.move_project_stage(
  p_project_id uuid,
  p_stage text,
  p_substage text,
  p_comment text,
  p_override_reason text default null
)
returns public.projects
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.projects%rowtype;
  missing text[];
  from_label text;
  to_label text;
  stage_changed boolean;
begin
  if not public.is_active_user() then raise exception 'Not authenticated'; end if;

  select * into p from public.projects where id = p_project_id for update;
  if not found then raise exception 'Project not found'; end if;

  if not (public.is_admin() or p.owner_id = auth.uid()) then
    raise exception 'Only the project owner or an admin can move stage';
  end if;

  stage_changed := p_stage is distinct from p.stage;
  if stage_changed and p_stage <> p.stage then
    missing := public.project_gate_incomplete(p_project_id, p.stage);
    if array_length(missing, 1) is not null and coalesce(p_override_reason, '') = '' then
      if not public.is_admin() then
        raise exception 'Gate incomplete: %', array_to_string(missing, '; ');
      else
        raise exception 'Admin override requires a reason. Incomplete: %', array_to_string(missing, '; ');
      end if;
    end if;
    if array_length(missing, 1) is not null and not public.is_admin() then
      raise exception 'Gate incomplete: %', array_to_string(missing, '; ');
    end if;
  end if;

  from_label := p.stage || ' / ' || p.substage;
  to_label := p_stage || ' / ' || p_substage;

  update public.projects
  set stage = p_stage,
      substage = p_substage,
      stage_entered_at = case when stage_changed then timezone('utc', now()) else stage_entered_at end,
      commissioning = case
        when p_stage = 'om' and coalesce(commissioning->>'omStart', '') = ''
        then commissioning || jsonb_build_object('omStart', (timezone('Asia/Kolkata', now()))::date::text)
        else commissioning
      end
  where id = p_project_id
  returning * into p;

  perform public.log_event(
    'project', p_project_id,
    case when p_override_reason is not null then 'override' else 'stage_change' end,
    p_comment, from_label, to_label, p_override_reason
  );

  return p;
end;
$$;

-- Decide approval (admin)
create or replace function public.decide_approval(
  p_approval_id uuid,
  p_approve boolean,
  p_comment text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.approvals%rowtype;
  project_id uuid;
  today_ist date := (timezone('Asia/Kolkata', now()))::date;
  verb text := case when p_approve then 'approved' else 'rejected' end;
  what text;
begin
  if not public.is_admin() then raise exception 'Only admins can decide approvals'; end if;

  select * into a from public.approvals where id = p_approval_id for update;
  if not found then raise exception 'Approval not found'; end if;
  if a.status <> 'pending' then raise exception 'Approval already decided'; end if;

  update public.approvals
  set status = case when p_approve then 'approved'::public.approval_status else 'rejected'::public.approval_status end,
      decided_by = auth.uid(),
      decided_at = timezone('utc', now()),
      decision_comment = p_comment
  where id = p_approval_id
  returning * into a;

  if a.type = 'won' then
    if p_approve then
      project_id := public.convert_lead_to_project(p_approval_id, auth.uid());
    else
      update public.leads set status = 'open' where id = a.entity_id;
    end if;
    what := 'Won';
  elsif a.type = 'loss' then
    if a.entity = 'lead' then
      if p_approve then
        update public.leads set status = 'lost', lost_reason = a.payload->>'category', lost_at = today_ist where id = a.entity_id;
      else
        update public.leads set status = 'open' where id = a.entity_id;
      end if;
    else
      if p_approve then
        update public.projects set archived = true, lost_reason = a.payload->>'category', loss_pending = false where id = a.entity_id;
      else
        update public.projects set loss_pending = false where id = a.entity_id;
      end if;
    end if;
    what := 'Loss';
  elsif a.type = 'reopen' then
    if p_approve then
      update public.leads
      set status = 'open', lost_reason = null, lost_at = null, last_moved_at = timezone('utc', now())
      where id = a.entity_id;
    end if;
    what := 'Reopen';
  elsif a.type = 'installation_reassign' then
    if p_approve then
      update public.projects set installation_owner_id = (a.payload->>'to')::uuid where id = a.entity_id;
    end if;
    what := 'Installation owner change';
  elsif a.type = 'owner_reassign' then
    if p_approve then
      if a.entity = 'lead' then
        update public.leads set owner_id = (a.payload->>'to')::uuid where id = a.entity_id;
      else
        update public.projects set owner_id = (a.payload->>'to')::uuid where id = a.entity_id;
      end if;
    end if;
    what := 'Owner change';
  end if;

  perform public.log_event(
    a.entity, a.entity_id, 'approval',
    what || ' ' || verb || '. ' || coalesce(p_comment, ''),
    null, null, null, null, p_approval_id
  );

  return jsonb_build_object(
    'approval', row_to_json(a),
    'projectId', project_id
  );
end;
$$;

-- Submit approval request
create or replace function public.submit_approval(
  p_type public.approval_type,
  p_entity public.entity_kind,
  p_entity_id uuid,
  p_payload jsonb
)
returns public.approvals
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.approvals%rowtype;
  label text;
begin
  if not public.is_active_user() then raise exception 'Not authenticated'; end if;

  insert into public.approvals (type, entity, entity_id, requested_by, payload)
  values (p_type, p_entity, p_entity_id, auth.uid(), coalesce(p_payload, '{}'::jsonb))
  returning * into a;

  if p_entity = 'lead' then
    if p_type = 'won' then update public.leads set status = 'won-pending' where id = p_entity_id; end if;
    if p_type = 'loss' then update public.leads set status = 'loss-pending' where id = p_entity_id; end if;
  elsif p_type = 'loss' and p_entity = 'project' then
    update public.projects set loss_pending = true where id = p_entity_id;
  end if;

  label := case p_type
    when 'won' then 'Won'
    when 'loss' then 'Loss'
    when 'reopen' then 'Reopen'
    when 'installation_reassign' then 'Installation owner change'
    when 'owner_reassign' then 'Owner change'
  end;

  perform public.log_event(
    p_entity, p_entity_id, 'request',
    label || ' requested. ' || coalesce(p_payload->>'reason', p_payload->>'explanation', p_payload->>'comment', ''),
    null, null, null, null, a.id
  );

  return a;
end;
$$;

-- Merge leads (admin)
create or replace function public.merge_leads(
  p_source_id uuid,
  p_target_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  max_n int;
begin
  if not public.is_admin() then raise exception 'Only admins can merge leads'; end if;

  select coalesce(max(meeting_n), 0) into max_n from public.lead_meetings where lead_id = p_target_id;

  insert into public.lead_meetings (
    lead_id, meeting_n, meeting_date, outcome, comment, next_action, next_action_date, created_by
  )
  select p_target_id, max_n + row_number() over (order by meeting_n),
         meeting_date, outcome, comment, next_action, next_action_date, auth.uid()
  from public.lead_meetings where lead_id = p_source_id;

  update public.tasks set lead_id = p_target_id where lead_id = p_source_id;
  update public.leads set merged_into = p_target_id, status = 'merged' where id = p_source_id;

  perform public.log_event('lead', p_source_id, 'merge', 'Merged into target. ' || coalesce(p_reason, ''));
  perform public.log_event('lead', p_target_id, 'merge', 'Duplicate merged in; history kept. ' || coalesce(p_reason, ''));
end;
$$;

-- Dashboard KPIs (admin company-wide; users scoped)
create or replace function public.dashboard_kpis(
  p_from date default null,
  p_to date default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  d_from date := coalesce(p_from, (date_trunc('month', timezone('Asia/Kolkata', now())))::date);
  d_to date := coalesce(p_to, (timezone('Asia/Kolkata', now()))::date);
  stale_days int;
  result jsonb;
begin
  select stale_sales_days into stale_days from public.app_settings where id = 'default';

  with scoped_leads as (
    select * from public.leads l
    where public.is_admin() or l.owner_id = auth.uid()
  ),
  scoped_projects as (
    select * from public.projects p
    where public.is_admin() or public.can_view_project(p.id)
  ),
  scoped_tasks as (
    select * from public.tasks t
    where public.is_admin() or t.assignee_id = auth.uid()
      or exists (select 1 from public.projects p where p.id = t.project_id and p.owner_id = auth.uid())
  )
  select jsonb_build_object(
    'period', jsonb_build_object('from', d_from, 'to', d_to),
    'newLeads', (select count(*) from scoped_leads where created_at::date between d_from and d_to),
    'salesWon', (select count(*) from scoped_projects where won_date between d_from and d_to and not archived),
    'wonCapacityKw', (select coalesce(sum(capacity_kw), 0) from scoped_projects where won_date between d_from and d_to and not archived),
    'wonValue', (select coalesce(sum(project_value), 0) from scoped_projects where won_date between d_from and d_to and not archived),
    'losses', (select count(*) from scoped_leads where status = 'lost' and lost_at between d_from and d_to),
    'installations', (select count(*) from scoped_projects
      where coalesce(nullif(installation->>'actualDate', ''), null)::date between d_from and d_to),
    'commissioned', (select count(*) from scoped_projects
      where coalesce(nullif(commissioning->>'date', ''), null)::date between d_from and d_to),
    'stalledSales', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', id, 'code', code, 'contact', contact_name, 'ownerId', owner_id,
        'lastMovedAt', last_moved_at, 'days', (d_to - last_moved_at::date)
      )), '[]'::jsonb)
      from scoped_leads
      where status = 'open' and stage = 'sales'
        and last_moved_at::date < d_to - stale_days
    ),
    'taskHealth', jsonb_build_object(
      'overdue', (select count(*) from scoped_tasks where status <> 'Completed' and due_date < d_to),
      'dueToday', (select count(*) from scoped_tasks where status <> 'Completed' and due_date = d_to),
      'dueSoon', (select count(*) from scoped_tasks where status <> 'Completed' and due_date between d_to + 1 and d_to + 7),
      'blocked', (select count(*) from scoped_tasks where status = 'Blocked'),
      'waiting', (select count(*) from scoped_tasks where status = 'Waiting')
    ),
    'loanPending', (
      select count(*) from scoped_projects
      where not archived and docs->'loan'->>'status' in ('Submitted', 'Pending')
    ),
    'portalQueries', (
      select count(*) from scoped_projects
      where not archived and docs->'portal'->>'status' = 'Query raised'
    )
  ) into result;

  return result;
end;
$$;

grant execute on function public.convert_lead_to_project to service_role, authenticated;
grant execute on function public.move_project_stage to authenticated;
grant execute on function public.decide_approval to authenticated;
grant execute on function public.submit_approval to authenticated;
grant execute on function public.merge_leads to authenticated;
grant execute on function public.dashboard_kpis to authenticated;
grant execute on function public.find_lead_duplicates to authenticated;
grant execute on function public.project_gate_incomplete to authenticated;
grant execute on function public.log_event to authenticated;

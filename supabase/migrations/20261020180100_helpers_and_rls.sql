-- Helpers, code generators, auth bootstrap, RLS

-- ---------------------------------------------------------------------------
-- Auth helpers
-- ---------------------------------------------------------------------------

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin' and p.active = true
  );
$$;

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.active = true
  );
$$;

-- Auto-create profile on signup (metadata: full_name, role, team, title, phone)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, team, title, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::public.app_role, 'user'),
    coalesce(new.raw_user_meta_data->>'team', 'Sales'),
    new.raw_user_meta_data->>'title',
    new.raw_user_meta_data->>'phone'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Human-readable codes: ECR-L-YYYY-NNN / ECR-P-YYYY-NNN / T-N / AP-N / SI-N
-- ---------------------------------------------------------------------------

create sequence if not exists public.lead_code_seq start 1;
create sequence if not exists public.project_code_seq start 1;
create sequence if not exists public.task_code_seq start 1;
create sequence if not exists public.approval_code_seq start 1;
create sequence if not exists public.service_issue_code_seq start 1;

create or replace function public.next_entity_code(prefix text, seq regclass)
returns text
language plpgsql
as $$
declare
  y text := to_char(timezone('Asia/Kolkata', now()), 'YYYY');
  n bigint;
begin
  execute format('select nextval(%L)', seq) into n;
  if prefix in ('ECR-L', 'ECR-P') then
    return prefix || '-' || y || '-' || lpad(n::text, 3, '0');
  end if;
  return prefix || '-' || n::text;
end;
$$;

create or replace function public.leads_set_code()
returns trigger language plpgsql as $$
begin
  if new.code is null or new.code = '' then
    new.code := public.next_entity_code('ECR-L', 'public.lead_code_seq');
  end if;
  return new;
end;
$$;

create or replace function public.projects_set_code()
returns trigger language plpgsql as $$
begin
  if new.code is null or new.code = '' then
    new.code := public.next_entity_code('ECR-P', 'public.project_code_seq');
  end if;
  return new;
end;
$$;

create or replace function public.tasks_set_code()
returns trigger language plpgsql as $$
begin
  if new.code is null or new.code = '' then
    new.code := public.next_entity_code('T', 'public.task_code_seq');
  end if;
  return new;
end;
$$;

create or replace function public.approvals_set_code()
returns trigger language plpgsql as $$
begin
  if new.code is null or new.code = '' then
    new.code := public.next_entity_code('AP', 'public.approval_code_seq');
  end if;
  return new;
end;
$$;

create or replace function public.service_issues_set_code()
returns trigger language plpgsql as $$
begin
  if new.code is null or new.code = '' then
    new.code := public.next_entity_code('SI', 'public.service_issue_code_seq');
  end if;
  return new;
end;
$$;

create trigger leads_set_code before insert on public.leads
  for each row execute function public.leads_set_code();
create trigger projects_set_code before insert on public.projects
  for each row execute function public.projects_set_code();
create trigger tasks_set_code before insert on public.tasks
  for each row execute function public.tasks_set_code();
create trigger approvals_set_code before insert on public.approvals
  for each row execute function public.approvals_set_code();
create trigger service_issues_set_code before insert on public.service_issues
  for each row execute function public.service_issues_set_code();

-- ---------------------------------------------------------------------------
-- Visibility helpers (BRD §4)
-- ---------------------------------------------------------------------------

create or replace function public.can_view_lead(p_lead_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or exists (
      select 1 from public.leads l
      where l.id = p_lead_id and l.owner_id = auth.uid()
    );
$$;

create or replace function public.can_view_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or exists (
      select 1 from public.projects p
      where p.id = p_project_id
        and (p.owner_id = auth.uid() or p.installation_owner_id = auth.uid())
    )
    or exists (
      select 1 from public.tasks t
      where t.project_id = p_project_id and t.assignee_id = auth.uid()
    );
$$;

create or replace function public.can_update_task(p_task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or exists (
      select 1 from public.tasks t
      left join public.projects p on p.id = t.project_id
      left join public.leads l on l.id = t.lead_id
      where t.id = p_task_id
        and (
          t.assignee_id = auth.uid()
          or p.owner_id = auth.uid()
          or l.owner_id = auth.uid()
        )
    );
$$;

-- ---------------------------------------------------------------------------
-- Audit logger
-- ---------------------------------------------------------------------------

create or replace function public.log_event(
  p_entity public.entity_kind,
  p_entity_id uuid,
  p_event_type text,
  p_comment text default null,
  p_from text default null,
  p_to text default null,
  p_reason text default null,
  p_parent_id uuid default null,
  p_approval_ref uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  eid uuid;
begin
  insert into public.workflow_events (
    entity, entity_id, parent_id, event_type, from_label, to_label,
    comment, reason, approval_ref, actor_id
  ) values (
    p_entity, p_entity_id, p_parent_id, p_event_type, p_from, p_to,
    p_comment, p_reason, p_approval_ref, auth.uid()
  ) returning id into eid;
  return eid;
end;
$$;

-- Prevent hard deletes on leads/projects (BRD: archive only)
create or replace function public.forbid_hard_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Hard delete is not allowed. Archive or merge instead.';
end;
$$;

create trigger leads_no_delete before delete on public.leads
  for each row execute function public.forbid_hard_delete();
create trigger projects_no_delete before delete on public.projects
  for each row execute function public.forbid_hard_delete();
create trigger workflow_events_no_delete before delete on public.workflow_events
  for each row execute function public.forbid_hard_delete();

-- Admins may delete task comments / config rows only via elevated paths;
-- workflow_events are immutable for everyone including admin.

-- ---------------------------------------------------------------------------
-- Duplicate detection
-- ---------------------------------------------------------------------------

create or replace function public.find_lead_duplicates(
  p_phone text,
  p_email text default null,
  p_consumer_no text default null,
  p_address text default null,
  p_exclude_id uuid default null
)
returns setof public.leads
language sql
stable
security definer
set search_path = public
as $$
  select l.*
  from public.leads l
  where l.status not in ('merged')
    and (p_exclude_id is null or l.id <> p_exclude_id)
    and (
      (p_phone is not null and regexp_replace(l.phone, '\D', '', 'g') = regexp_replace(p_phone, '\D', '', 'g'))
      or (p_email is not null and p_email <> '' and lower(l.email) = lower(p_email))
      or (p_consumer_no is not null and p_consumer_no <> '' and lower(l.consumer_no) = lower(p_consumer_no))
      or (p_address is not null and p_address <> '' and lower(trim(l.address)) = lower(trim(p_address)))
    )
    and (public.is_admin() or l.owner_id = auth.uid() or public.can_view_lead(l.id));
$$;

-- ---------------------------------------------------------------------------
-- Gate checklist validation
-- ---------------------------------------------------------------------------

create or replace function public.project_gate_incomplete(p_project_id uuid, p_from_stage text)
returns text[]
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  p public.projects%rowtype;
  missing text[] := '{}';
  item record;
  checked boolean;
begin
  select * into p from public.projects where id = p_project_id;
  if not found then
    return array['Project not found'];
  end if;

  for item in
    select *
    from public.checklist_items ci
    where ci.stage_key = p_from_stage
      and ci.required = true
      and (ci.schemes is null or p.scheme = any (ci.schemes))
      and (ci.types is null or p.type = any (ci.types))
    order by ci.sort_order
  loop
    checked := coalesce((p.checklist -> p_from_stage ->> item.key)::boolean, false);
    if not checked then
      missing := array_append(missing, item.label);
    end if;
  end loop;

  return missing;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.app_settings enable row level security;
alter table public.schemes enable row level security;
alter table public.workflow_stages enable row level security;
alter table public.workflow_substages enable row level security;
alter table public.checklist_items enable row level security;
alter table public.loss_reasons enable row level security;
alter table public.drive_folder_defs enable row level security;
alter table public.leads enable row level security;
alter table public.lead_meetings enable row level security;
alter table public.projects enable row level security;
alter table public.drive_folders enable row level security;
alter table public.service_issues enable row level security;
alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;
alter table public.approvals enable row level security;
alter table public.workflow_events enable row level security;

-- Profiles
create policy profiles_select on public.profiles for select to authenticated
  using (public.is_active_user() and (public.is_admin() or id = auth.uid() or active = true));
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));
create policy profiles_admin_all on public.profiles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Config (read all active users; write admin)
create policy settings_select on public.app_settings for select to authenticated using (public.is_active_user());
create policy settings_admin on public.app_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy schemes_select on public.schemes for select to authenticated using (public.is_active_user());
create policy schemes_admin on public.schemes for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy stages_select on public.workflow_stages for select to authenticated using (public.is_active_user());
create policy stages_admin on public.workflow_stages for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy substages_select on public.workflow_substages for select to authenticated using (public.is_active_user());
create policy substages_admin on public.workflow_substages for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy checklist_select on public.checklist_items for select to authenticated using (public.is_active_user());
create policy checklist_admin on public.checklist_items for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy loss_select on public.loss_reasons for select to authenticated using (public.is_active_user());
create policy loss_admin on public.loss_reasons for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy drive_defs_select on public.drive_folder_defs for select to authenticated using (public.is_active_user());
create policy drive_defs_admin on public.drive_folder_defs for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Leads
create policy leads_select on public.leads for select to authenticated
  using (public.is_active_user() and (public.is_admin() or owner_id = auth.uid()));
create policy leads_insert on public.leads for insert to authenticated
  with check (
    public.is_active_user()
    and created_by = auth.uid()
    and (public.is_admin() or owner_id = auth.uid())
  );
create policy leads_update on public.leads for update to authenticated
  using (public.is_active_user() and (public.is_admin() or owner_id = auth.uid()))
  with check (public.is_active_user() and (public.is_admin() or owner_id = auth.uid()));

create policy lead_meetings_select on public.lead_meetings for select to authenticated
  using (public.can_view_lead(lead_id));
create policy lead_meetings_write on public.lead_meetings for all to authenticated
  using (public.can_view_lead(lead_id))
  with check (public.can_view_lead(lead_id));

-- Projects
create policy projects_select on public.projects for select to authenticated
  using (public.is_active_user() and public.can_view_project(id));
create policy projects_insert on public.projects for insert to authenticated
  with check (public.is_admin()); -- Won conversion via edge function / service role
create policy projects_update on public.projects for update to authenticated
  using (
    public.is_active_user()
    and (public.is_admin() or owner_id = auth.uid() or installation_owner_id = auth.uid())
  )
  with check (
    public.is_active_user()
    and (public.is_admin() or owner_id = auth.uid() or installation_owner_id = auth.uid())
  );

create policy drive_folders_select on public.drive_folders for select to authenticated
  using (public.can_view_project(project_id));
create policy drive_folders_write on public.drive_folders for all to authenticated
  using (public.is_admin() or exists (
    select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()
  ))
  with check (public.is_admin() or exists (
    select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()
  ));

create policy service_issues_select on public.service_issues for select to authenticated
  using (public.can_view_project(project_id));
create policy service_issues_write on public.service_issues for all to authenticated
  using (public.can_view_project(project_id))
  with check (public.can_view_project(project_id));

-- Tasks
create policy tasks_select on public.tasks for select to authenticated
  using (
    public.is_active_user()
    and (
      public.is_admin()
      or assignee_id = auth.uid()
      or exists (select 1 from public.projects p where p.id = project_id and (p.owner_id = auth.uid() or p.installation_owner_id = auth.uid()))
      or exists (select 1 from public.leads l where l.id = lead_id and l.owner_id = auth.uid())
    )
  );
create policy tasks_insert on public.tasks for insert to authenticated
  with check (
    public.is_active_user()
    and (
      public.is_admin()
      or exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
      or exists (select 1 from public.leads l where l.id = lead_id and l.owner_id = auth.uid())
    )
  );
create policy tasks_update on public.tasks for update to authenticated
  using (public.can_update_task(id))
  with check (public.can_update_task(id));

create policy task_comments_select on public.task_comments for select to authenticated
  using (public.can_update_task(task_id) or exists (
    select 1 from public.tasks t where t.id = task_id and (
      public.is_admin() or t.assignee_id = auth.uid()
    )
  ));
create policy task_comments_insert on public.task_comments for insert to authenticated
  with check (author_id = auth.uid() and public.can_update_task(task_id));

-- Approvals
create policy approvals_select on public.approvals for select to authenticated
  using (public.is_admin() or requested_by = auth.uid());
create policy approvals_insert on public.approvals for insert to authenticated
  with check (public.is_active_user() and requested_by = auth.uid());
create policy approvals_update_admin on public.approvals for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Audit: users see events for records they can view; admins see all
create policy events_select on public.workflow_events for select to authenticated
  using (
    public.is_admin()
    or actor_id = auth.uid()
    or (entity = 'lead' and public.can_view_lead(entity_id))
    or (entity = 'project' and public.can_view_project(entity_id))
    or (entity = 'task' and public.can_update_task(entity_id))
  );
create policy events_insert on public.workflow_events for insert to authenticated
  with check (public.is_active_user() and (actor_id = auth.uid() or actor_id is null));

-- Grants
grant usage on schema public to authenticated, anon, service_role;
grant select, insert, update on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

-- Ecorays Solar EPC Tracking — core schema (BRD v0.9)
-- Project: Ecorays (ipyegvknczkhtfpzttay)

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.app_role as enum ('admin', 'user');
create type public.project_type as enum ('residential', 'commercial');
create type public.lead_status as enum (
  'open', 'won-pending', 'loss-pending', 'won', 'lost', 'merged'
);
create type public.task_status as enum (
  'To Do', 'In Progress', 'Waiting', 'Blocked', 'Under Review', 'Completed'
);
create type public.task_priority as enum ('Low', 'Medium', 'High', 'Urgent');
create type public.approval_type as enum (
  'won', 'loss', 'reopen', 'installation_reassign', 'owner_reassign'
);
create type public.approval_status as enum ('pending', 'approved', 'rejected');
create type public.entity_kind as enum ('lead', 'project', 'task', 'user', 'config');
create type public.drive_mode as enum ('manual', 'auto');
create type public.annual_basis as enum ('financial_year', 'calendar_year');

-- ---------------------------------------------------------------------------
-- Profiles (extends auth.users)
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text not null,
  phone text,
  role public.app_role not null default 'user',
  team text not null default 'Sales',
  title text,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index profiles_role_idx on public.profiles (role);
create index profiles_active_idx on public.profiles (active);

-- ---------------------------------------------------------------------------
-- App configuration (admin-editable)
-- ---------------------------------------------------------------------------

create table public.app_settings (
  id text primary key default 'default',
  won_condition text not null default 'either',
  stale_sales_days integer not null default 21,
  drive_mode public.drive_mode not null default 'manual',
  drive_root_name text not null default 'Ecorays Projects',
  folder_pattern text not null default '{projectId} — {client}',
  annual_basis public.annual_basis not null default 'financial_year',
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.profiles (id)
);

create table public.schemes (
  key text primary key,
  name text not null,
  portal text,
  types public.project_type[] not null default '{residential,commercial}',
  active boolean not null default true,
  subsidy boolean not null default false,
  note text,
  sort_order integer not null default 0
);

create table public.workflow_stages (
  key text primary key,
  name text not null,
  short_name text not null,
  folder_key text,
  sort_order integer not null,
  is_project_stage boolean not null default true
);

create table public.workflow_substages (
  id bigserial primary key,
  stage_key text not null references public.workflow_stages (key) on delete cascade,
  name text not null,
  sort_order integer not null,
  unique (stage_key, name)
);

create table public.checklist_items (
  id bigserial primary key,
  stage_key text not null references public.workflow_stages (key) on delete cascade,
  key text not null,
  label text not null,
  required boolean not null default true,
  schemes text[],
  types public.project_type[],
  sort_order integer not null default 0,
  unique (stage_key, key)
);

create table public.loss_reasons (
  id bigserial primary key,
  label text not null unique,
  active boolean not null default true,
  sort_order integer not null default 0
);

create table public.drive_folder_defs (
  key text primary key,
  name text not null,
  hint text,
  sort_order integer not null
);

-- ---------------------------------------------------------------------------
-- Leads
-- ---------------------------------------------------------------------------

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid not null references public.profiles (id),
  type public.project_type not null,
  source text not null,
  referrer text,
  contact_name text not null,
  business_name text,
  phone text not null,
  email text,
  address text not null,
  district text not null,
  taluka text not null,
  consumer_no text,
  owner_id uuid not null references public.profiles (id),
  stage text not null default 'lead' references public.workflow_stages (key),
  substage text not null default 'New',
  status public.lead_status not null default 'open',
  last_moved_at timestamptz not null default timezone('utc', now()),
  next_action text,
  next_action_date date,
  estimated_kw numeric(10, 2),
  survey_requested boolean not null default false,
  surveyor_id uuid references public.profiles (id),
  lost_reason text,
  lost_at date,
  won_at date,
  project_id uuid,
  merged_into uuid references public.leads (id),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint leads_phone_normalized check (length(regexp_replace(phone, '\D', '', 'g')) >= 8)
);

create index leads_owner_idx on public.leads (owner_id);
create index leads_status_idx on public.leads (status);
create index leads_stage_idx on public.leads (stage, substage);
create index leads_phone_idx on public.leads (regexp_replace(phone, '\D', '', 'g'));
create index leads_email_idx on public.leads (lower(email)) where email is not null;
create index leads_consumer_idx on public.leads (lower(consumer_no)) where consumer_no is not null;
create index leads_district_idx on public.leads (district, taluka);

create table public.lead_meetings (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  meeting_n integer not null,
  meeting_date date not null,
  outcome text not null,
  comment text,
  next_action text,
  next_action_date date,
  schedule_survey boolean not null default false,
  surveyor_id uuid references public.profiles (id),
  survey_date date,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.profiles (id),
  unique (lead_id, meeting_n)
);

-- ---------------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------------

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  lead_id uuid references public.leads (id),
  client_name text not null,
  contact_name text not null,
  business_name text,
  phone text not null,
  email text,
  type public.project_type not null,
  scheme text not null references public.schemes (key),
  address text not null,
  district text not null,
  taluka text not null,
  consumer_no text,
  capacity_kw numeric(10, 2) not null,
  project_value numeric(14, 2) not null default 0,
  sanctioned_demand text,
  won_date date not null,
  source text,
  owner_id uuid not null references public.profiles (id),
  installation_owner_id uuid references public.profiles (id),
  stage text not null default 'won' references public.workflow_stages (key),
  substage text not null default 'Client created',
  stage_entered_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  checklist jsonb not null default '{}'::jsonb,
  blocked jsonb,
  archived boolean not null default false,
  loss_pending boolean not null default false,
  lost_reason text,
  -- Nested stage sections (match frontend shape)
  survey jsonb not null default '{}'::jsonb,
  docs jsonb not null default '{}'::jsonb,
  procurement jsonb not null default '{}'::jsonb,
  installation jsonb not null default '{}'::jsonb,
  milestones jsonb not null default '[]'::jsonb,
  subsidy text not null default 'Not started',
  commissioning jsonb not null default '{}'::jsonb,
  drive_root_url text,
  constraint projects_capacity_positive check (capacity_kw > 0)
);

create index projects_owner_idx on public.projects (owner_id);
create index projects_install_owner_idx on public.projects (installation_owner_id);
create index projects_stage_idx on public.projects (stage, substage);
create index projects_scheme_idx on public.projects (scheme);
create index projects_archived_idx on public.projects (archived);
create index projects_type_idx on public.projects (type);
create index projects_won_date_idx on public.projects (won_date);
create index projects_lead_idx on public.projects (lead_id);

alter table public.leads
  add constraint leads_project_fk
  foreign key (project_id) references public.projects (id);

create table public.drive_folders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  folder_key text not null, -- 'root' or drive_folder_defs.key
  folder_url text,
  drive_id text,
  access_note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.profiles (id),
  unique (project_id, folder_key)
);

create table public.service_issues (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  code text not null,
  title text not null,
  status text not null default 'Open' check (status in ('Open', 'Closed')),
  raised_at date not null default (timezone('Asia/Kolkata', now()))::date,
  closed_at date,
  created_by uuid references public.profiles (id),
  unique (project_id, code)
);

-- ---------------------------------------------------------------------------
-- Tasks
-- ---------------------------------------------------------------------------

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  project_id uuid references public.projects (id) on delete cascade,
  lead_id uuid references public.leads (id) on delete cascade,
  title text not null,
  stage text not null references public.workflow_stages (key),
  assignee_id uuid not null references public.profiles (id),
  due_date date not null,
  priority public.task_priority not null default 'Medium',
  status public.task_status not null default 'To Do',
  required boolean not null default false,
  requires_drive boolean not null default false,
  blocker text,
  waiting_on text,
  completed_at date,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.profiles (id),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint tasks_parent_check check (project_id is not null or lead_id is not null)
);

create index tasks_assignee_idx on public.tasks (assignee_id);
create index tasks_status_idx on public.tasks (status);
create index tasks_due_idx on public.tasks (due_date);
create index tasks_project_idx on public.tasks (project_id);
create index tasks_lead_idx on public.tasks (lead_id);

create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  author_id uuid not null references public.profiles (id),
  body text not null,
  created_at timestamptz not null default timezone('utc', now())
);

-- ---------------------------------------------------------------------------
-- Approvals & audit
-- ---------------------------------------------------------------------------

create table public.approvals (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  type public.approval_type not null,
  entity public.entity_kind not null,
  entity_id uuid not null,
  requested_by uuid not null references public.profiles (id),
  requested_at timestamptz not null default timezone('utc', now()),
  status public.approval_status not null default 'pending',
  payload jsonb not null default '{}'::jsonb,
  decided_by uuid references public.profiles (id),
  decided_at timestamptz,
  decision_comment text
);

create index approvals_status_idx on public.approvals (status);
create index approvals_entity_idx on public.approvals (entity, entity_id);
create index approvals_requested_by_idx on public.approvals (requested_by);

create table public.workflow_events (
  id uuid primary key default gen_random_uuid(),
  entity public.entity_kind not null,
  entity_id uuid not null,
  parent_id uuid,
  event_type text not null,
  from_label text,
  to_label text,
  comment text,
  reason text,
  approval_ref uuid references public.approvals (id),
  actor_id uuid references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now())
);

create index workflow_events_entity_idx on public.workflow_events (entity, entity_id, created_at desc);
create index workflow_events_actor_idx on public.workflow_events (actor_id);
create index workflow_events_type_idx on public.workflow_events (event_type);

-- ---------------------------------------------------------------------------
-- Updated-at helper
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger leads_updated_at before update on public.leads
  for each row execute function public.set_updated_at();
create trigger projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();
create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();
create trigger drive_folders_updated_at before update on public.drive_folders
  for each row execute function public.set_updated_at();

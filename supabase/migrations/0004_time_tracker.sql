-- Time Tracker module.
--
-- Hierarchy: companies → projects → work_items → time_entries.
--
-- The whole point of the module is that a Work Item — not "company + project"
-- — is the unit of work, so `time_entries` reference `work_items` and nothing
-- else. Company and project are reached by walking up through the work item,
-- never copied onto the entry: re-parenting a work item then moves its whole
-- history with it instead of leaving entries pointing at a stale company.
--
-- Deliberately NOT workspace-scoped, unlike posts/files. A workspace here means
-- "which social calendar" (Wonderlearn vs. Dr. Wael); a company is a client.
-- They're orthogonal axes, and tracked time spans both.
--
-- Run this once in the Supabase SQL Editor.

create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  "createdBy" text not null default '',
  "createdAt" timestamptz not null default now()
);

-- Case-insensitive uniqueness so "Jisraa" and "jisraa" can't both be created
-- from the type-to-create field.
create unique index companies_name_key on companies (lower(name));

create table projects (
  id uuid primary key default gen_random_uuid(),
  "companyId" uuid not null references companies(id) on delete cascade,
  name text not null,
  "createdBy" text not null default '',
  "createdAt" timestamptz not null default now()
);

create unique index projects_company_name_key on projects ("companyId", lower(name));
create index projects_company_idx on projects ("companyId");

-- Work item codes (WI-000182) are the human-facing immutable handle. A plain
-- sequence default rather than a generated column: the code is assigned once at
-- insert and never recomputed, even if the row is later renamed or re-parented.
create sequence work_item_code_seq start 1;

create table work_items (
  id uuid primary key default gen_random_uuid(),
  code text not null unique
    default ('WI-' || lpad(nextval('work_item_code_seq')::text, 6, '0')),
  "projectId" uuid not null references projects(id) on delete cascade,
  name text not null,
  description text not null default '',
  status text not null default 'todo'
    check (status in ('backlog', 'todo', 'in_progress', 'review', 'completed')),
  -- Optional links out to the rest of the app. Work exists before its file does,
  -- so both are nullable and clearing either never deletes the work item.
  "fileId" uuid references files(id) on delete set null,
  "postId" uuid references posts(id) on delete set null,
  "createdBy" text not null default '',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index work_items_project_idx on work_items ("projectId");
create index work_items_file_idx on work_items ("fileId");

create table time_entries (
  id uuid primary key default gen_random_uuid(),
  -- Who tracked the time, by display name. This app has two shared login
  -- accounts and attributes everything else (assignee, createdBy) by name too,
  -- so time follows the same convention.
  "userName" text not null,
  "workItemId" uuid not null references work_items(id) on delete cascade,
  description text not null default '',
  "startTime" timestamptz not null,
  "endTime" timestamptz,
  -- Seconds. 0 while running — the live figure is computed from startTime so a
  -- tab that's been closed for an hour still shows the right elapsed time.
  duration integer not null default 0,
  -- yyyy-MM-dd of the local day the entry belongs to, so "today" and date
  -- filters don't have to re-derive a timezone from the timestamp.
  date text not null,
  status text not null default 'running'
    check (status in ('running', 'completed', 'manual', 'edited')),
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index time_entries_user_date_idx on time_entries ("userName", date);
create index time_entries_work_item_idx on time_entries ("workItemId");
create index time_entries_date_idx on time_entries (date);

-- One running timer per person, enforced by the database rather than only by
-- the UI — two tabs racing to start can't both win.
create unique index time_entries_one_running_per_user
  on time_entries ("userName") where status = 'running';

-- Same tradeoff as every other table: public read (nothing here needs hiding,
-- and the team-visibility requirement wants it readable), authenticated-only
-- write (there is no admin/user distinction in this app).

alter table companies enable row level security;
alter table projects enable row level security;
alter table work_items enable row level security;
alter table time_entries enable row level security;

create policy "companies are publicly readable" on companies
  for select using (true);
create policy "companies are manageable by signed-in accounts" on companies
  for all to authenticated using (true) with check (true);

create policy "projects are publicly readable" on projects
  for select using (true);
create policy "projects are manageable by signed-in accounts" on projects
  for all to authenticated using (true) with check (true);

create policy "work items are publicly readable" on work_items
  for select using (true);
create policy "work items are manageable by signed-in accounts" on work_items
  for all to authenticated using (true) with check (true);

create policy "time entries are publicly readable" on time_entries
  for select using (true);
create policy "time entries are manageable by signed-in accounts" on time_entries
  for all to authenticated using (true) with check (true);

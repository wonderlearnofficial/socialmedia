-- Wonderlearn content calendar — initial schema.
-- Run this once in the Supabase dashboard: SQL Editor → New query → paste → Run.

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────

create table posts (
  id uuid primary key default gen_random_uuid(),
  workspace text not null check (workspace in ('wonderlearn', 'dr_wael')),
  title text not null,
  description text not null default '',
  topic text not null default '',
  caption text not null default '',
  date date not null,
  -- kept as text (not Postgres `time`) so it round-trips as exactly "HH:mm",
  -- matching the app's format with no server/client mapping layer.
  time text not null check (time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  platforms text[] not null check (
    platforms <@ array['instagram','facebook','youtube','tiktok','x','linkedin']::text[]
  ),
  "contentType" text not null check (
    "contentType" in ('image','video','carousel','reel','story','text')
  ),
  "contentUrl" text,
  "contentFileName" text,
  "mediaPreview" text,
  status text not null check (
    status in ('draft','in_review','changes_requested','approved','scheduled','published')
  ),
  assignee text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index posts_workspace_date_idx on posts (workspace, date);

create table feedback (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  author text not null,
  role text not null check (role in ('owner', 'manager', 'system')),
  kind text not null check (kind in ('comment', 'status_change')),
  message text not null,
  status text check (
    status in ('draft','in_review','changes_requested','approved','scheduled','published')
  ),
  "createdAt" timestamptz not null default now()
);

create index feedback_post_id_idx on feedback (post_id);

create table shares (
  -- the human-readable id (e.g. "dr_wael-august-2026-x7k2a1") the app already
  -- generates client-side, kept as the primary key since it's used directly in URLs.
  id text primary key,
  workspace text not null check (workspace in ('wonderlearn', 'dr_wael')),
  month text not null,
  "createdAt" timestamptz not null default now()
);

create table team_members (
  id uuid primary key default gen_random_uuid(),
  workspace text not null check (workspace in ('wonderlearn', 'dr_wael')),
  name text not null,
  role text not null,
  email text not null,
  focus text[] not null default array[]::text[] check (
    focus <@ array['instagram','facebook','youtube','tiktok','x','linkedin']::text[]
  )
);

-- Both tables start empty on purpose — no seed data.

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────
-- Reading posts/feedback/shares stays public (no login) — that's what makes
-- an owner's share link work with no account. Every mutation that represents
-- real authoring power (create/edit/delete posts, create shares, manage the
-- team roster) requires a signed-in session. The one deliberate exception is
-- `add_feedback` below: an anonymous owner approving a post or requesting
-- changes needs to write, without being able to edit anything else.

alter table posts enable row level security;
alter table feedback enable row level security;
alter table shares enable row level security;
alter table team_members enable row level security;

create policy "posts are publicly readable" on posts
  for select using (true);
create policy "posts are writable by signed-in managers" on posts
  for insert to authenticated with check (true);
create policy "posts are updatable by signed-in managers" on posts
  for update to authenticated using (true);
create policy "posts are deletable by signed-in managers" on posts
  for delete to authenticated using (true);

create policy "feedback is publicly readable" on feedback
  for select using (true);
-- No direct insert policy for feedback: all writes go through add_feedback()
-- below, which runs as the function owner and can write regardless of caller.

create policy "shares are publicly readable" on shares
  for select using (true);
create policy "shares are creatable by signed-in managers" on shares
  for insert to authenticated with check (true);

create policy "team members are publicly readable" on team_members
  for select using (true);
create policy "team members are manageable by signed-in managers" on team_members
  for all to authenticated using (true) with check (true);

-- ─────────────────────────────────────────────────────────────
-- add_feedback: the one anonymous-writable mutation.
-- Inserts a feedback row and, if a status was given, applies it to the post
-- — exactly what the app's review flow (approve / request changes / comment)
-- needs, and nothing more. Callable by anyone; the narrow surface area here
-- *is* the security boundary, not a login check.
-- ─────────────────────────────────────────────────────────────

create function add_feedback(
  p_post_id uuid,
  p_author text,
  p_role text,
  p_kind text,
  p_message text,
  p_status text default null
)
returns feedback
language plpgsql
security definer
set search_path = public
as $$
declare
  result feedback;
begin
  insert into feedback (post_id, author, role, kind, message, status)
  values (p_post_id, p_author, p_role, p_kind, p_message, p_status)
  returning * into result;

  if p_status is not null then
    update posts set status = p_status, "updatedAt" = now() where id = p_post_id;
  end if;

  return result;
end;
$$;

grant execute on function add_feedback(uuid, text, text, text, text, text) to anon, authenticated;

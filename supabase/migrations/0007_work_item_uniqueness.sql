-- One work item per name per project.
--
-- Without this, two people typing "Newton Presentation" on the same project get
-- two separate work items, and the time each of them tracked lands on a
-- different row. The whole point of a work item is that it's the single place
-- everyone's hours on one piece of work accumulate — a duplicate silently
-- splits the contributor list.
--
-- Existing duplicates are merged first: their time entries are repointed onto
-- the oldest of the set, so no tracked time is lost, only the extra shells.
--
-- Run this once in the Supabase SQL Editor.

-- 1. Repoint entries from every duplicate onto the keeper (the oldest row).
with ranked as (
  select
    id,
    first_value(id) over (
      partition by "projectId", lower(name) order by "createdAt", id
    ) as keeper
  from work_items
)
update time_entries te
set "workItemId" = ranked.keeper
from ranked
where te."workItemId" = ranked.id
  and ranked.id <> ranked.keeper;

-- 2. Now the duplicates hold nothing, so removing them can't cascade any time
--    entries away.
with ranked as (
  select
    id,
    first_value(id) over (
      partition by "projectId", lower(name) order by "createdAt", id
    ) as keeper
  from work_items
)
delete from work_items wi
using ranked
where wi.id = ranked.id
  and ranked.id <> ranked.keeper;

-- 3. Case-insensitive, so "Newton Flyer" and "newton flyer" can't both exist.
create unique index if not exists work_items_project_name_key
  on work_items ("projectId", lower(name));

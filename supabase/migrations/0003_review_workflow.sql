-- Review workflow: the status set collapses to the four states the design
-- team actually moves through, and posts gain the fields the Review → Done
-- handoff needs. Run this once in the Supabase SQL Editor.
--
--   review          → waiting for someone to check the design
--   changes_required → reviewer asked for modifications
--   waiting_to_post  → approved, image moved to the Done folder
--   posted           → published (marked by hand; this app never publishes)

-- ─────────────────────────────────────────────────────────────
-- Statuses
-- ─────────────────────────────────────────────────────────────
-- Drop first, remap, then re-add: the old check would reject the new values
-- and the new one would reject the old, so nothing can be constrained during
-- the rewrite. The names are the defaults Postgres gave the inline checks
-- in 0001.

alter table posts drop constraint if exists posts_status_check;
alter table feedback drop constraint if exists feedback_status_check;

update posts set status = case status
  when 'draft' then 'review'
  when 'in_review' then 'review'
  when 'changes_requested' then 'changes_required'
  when 'approved' then 'waiting_to_post'
  when 'scheduled' then 'waiting_to_post'
  when 'published' then 'posted'
  else status
end;

update feedback set status = case status
  when 'draft' then 'review'
  when 'in_review' then 'review'
  when 'changes_requested' then 'changes_required'
  when 'approved' then 'waiting_to_post'
  when 'scheduled' then 'waiting_to_post'
  when 'published' then 'posted'
  else status
end
where status is not null;

alter table posts add constraint posts_status_check
  check (status in ('review', 'changes_required', 'waiting_to_post', 'posted'));
alter table feedback add constraint feedback_status_check
  check (status in ('review', 'changes_required', 'waiting_to_post', 'posted'));

-- ─────────────────────────────────────────────────────────────
-- Drive handle + completion bookkeeping
-- ─────────────────────────────────────────────────────────────
-- "driveFileId" is what makes the move possible at all — Drive needs the file
-- id to relocate it. "driveStage" records where that file actually ended up,
-- kept separate from `status` on purpose: if the Drive move fails after the
-- status changed (or vice versa), the disagreement is visible and fixable
-- instead of silently assumed away.

alter table posts
  add column if not exists "driveFileId" text,
  add column if not exists "driveStage" text,
  add column if not exists "createdBy" text,
  add column if not exists "reviewedBy" text,
  add column if not exists "completedAt" timestamptz;

alter table posts drop constraint if exists posts_drivestage_check;
alter table posts add constraint posts_drivestage_check
  check ("driveStage" is null or "driveStage" in ('review', 'done'));

-- ─────────────────────────────────────────────────────────────
-- add_feedback, extended
-- ─────────────────────────────────────────────────────────────
-- Still the one anonymous-writable mutation, and now it carries completion
-- bookkeeping too. That matters because the client reviewing a share link is
-- anonymous: this RPC is the only write they're granted, so marking a post
-- complete — status, who completed it, when, and where the image landed —
-- all has to happen inside this one call.
--
-- Dropped and recreated rather than replaced: adding a parameter makes a new
-- signature, and leaving the 6-argument version in place would make calls
-- ambiguous.

drop function if exists add_feedback(uuid, text, text, text, text, text);

create function add_feedback(
  p_post_id uuid,
  p_author text,
  p_role text,
  p_kind text,
  p_message text,
  p_status text default null,
  p_drive_stage text default null
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

  if p_status is not null or p_drive_stage is not null then
    update posts set
      status = coalesce(p_status, status),
      -- Completing records the reviewer; sending it back to review or asking
      -- for changes undoes that, so a re-completed post credits whoever
      -- completed it that time round.
      "reviewedBy" = case
        when p_status = 'waiting_to_post' then p_author
        when p_status in ('review', 'changes_required') then null
        else "reviewedBy"
      end,
      "completedAt" = case
        when p_status = 'waiting_to_post' then now()
        when p_status in ('review', 'changes_required') then null
        else "completedAt"
      end,
      "driveStage" = coalesce(p_drive_stage, "driveStage"),
      "updatedAt" = now()
    where id = p_post_id;
  end if;

  return result;
end;
$$;

grant execute on function add_feedback(uuid, text, text, text, text, text, text) to anon, authenticated;

-- Team member profile photos.
--
-- The app already writes `avatarUrl` (and reads `lastActive`) on team members,
-- but neither column existed — every insert with an avatar came back 400.
-- This adds them, and creates the storage bucket the upload path expects so
-- avatars stop falling back to a base64 data URL in a text column.
--
-- Run this once in the Supabase SQL Editor.

alter table team_members add column if not exists "avatarUrl" text;

-- Set whenever the person is seen doing something. Nullable: most rows have no
-- recorded activity yet, and "unknown" must stay distinguishable from "now".
alter table team_members add column if not exists "lastActive" timestamptz;

-- Public bucket: avatars are shown on the no-login review page, so they have to
-- be readable without a session — same reasoning as public SELECT on every
-- content table.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- Writes stay signed-in only, and are scoped to this one bucket so an avatar
-- upload can never touch anything else in storage.
drop policy if exists "avatars are publicly readable" on storage.objects;
create policy "avatars are publicly readable" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars are writable by signed-in accounts" on storage.objects;
create policy "avatars are writable by signed-in accounts" on storage.objects
  for insert to authenticated with check (bucket_id = 'avatars');

drop policy if exists "avatars are updatable by signed-in accounts" on storage.objects;
create policy "avatars are updatable by signed-in accounts" on storage.objects
  for update to authenticated using (bucket_id = 'avatars') with check (bucket_id = 'avatars');

drop policy if exists "avatars are deletable by signed-in accounts" on storage.objects;
create policy "avatars are deletable by signed-in accounts" on storage.objects
  for delete to authenticated using (bucket_id = 'avatars');

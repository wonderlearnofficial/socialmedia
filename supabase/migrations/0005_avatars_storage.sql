-- ─────────────────────────────────────────────────────────────
-- 0005: Avatar Storage Bucket and team_members avatarUrl column
-- ─────────────────────────────────────────────────────────────

-- 1. Ensure team_members table has avatarUrl column
alter table team_members add column if not exists "avatarUrl" text;

-- 2. Create public storage bucket for avatars
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- 3. Public read policy for avatars
create policy "avatars are publicly accessible" on storage.objects
  for select using (bucket_id = 'avatars');

-- 4. Signed-in upload policy for avatars
create policy "avatars are uploadable by signed-in accounts" on storage.objects
  for insert to authenticated with check (bucket_id = 'avatars');

-- 5. Signed-in update and delete policy for avatars
create policy "avatars are manageable by signed-in accounts" on storage.objects
  for all to authenticated using (bucket_id = 'avatars') with check (bucket_id = 'avatars');

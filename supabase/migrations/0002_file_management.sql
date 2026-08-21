-- File Management module — folders and files are references to Google Drive
-- content, not the content itself. Run this once in the Supabase SQL Editor.

create table folders (
  id uuid primary key default gen_random_uuid(),
  workspace text not null check (workspace in ('wonderlearn', 'dr_wael')),
  name text not null,
  "driveFolderId" text not null,
  "parentId" uuid references folders(id) on delete cascade,
  "createdBy" text not null,
  "createdAt" timestamptz not null default now()
);

create index folders_workspace_parent_idx on folders (workspace, "parentId");

create table files (
  id uuid primary key default gen_random_uuid(),
  workspace text not null check (workspace in ('wonderlearn', 'dr_wael')),
  name text not null,
  type text not null,
  size bigint not null default 0,
  "driveUrl" text not null,
  "driveFileId" text not null,
  "folderId" uuid references folders(id) on delete set null,
  "postId" uuid references posts(id) on delete set null,
  "uploadedBy" text not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index files_workspace_folder_idx on files (workspace, "folderId");
create index files_post_idx on files ("postId");

-- Same tradeoff as every other table: public read (nothing here needs to be
-- hidden), authenticated-only write (no admin/user distinction).

alter table folders enable row level security;
alter table files enable row level security;

create policy "folders are publicly readable" on folders
  for select using (true);
create policy "folders are manageable by signed-in accounts" on folders
  for all to authenticated using (true) with check (true);

create policy "files are publicly readable" on files
  for select using (true);
create policy "files are manageable by signed-in accounts" on files
  for all to authenticated using (true) with check (true);

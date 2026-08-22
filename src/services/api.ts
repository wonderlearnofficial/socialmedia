import { supabase } from './supabaseClient'
import type {
  Company,
  CompanyInput,
  DriveFile,
  DriveFolder,
  DriveStage,
  FeedbackInput,
  FileRecordInput,
  FolderInput,
  Post,
  PostInput,
  Project,
  ProjectInput,
  ShareLink,
  TeamMember,
  TeamMemberInput,
  TimeEntry,
  TimeEntryInput,
  WorkItem,
  WorkItemInput,
  WorkspaceId,
} from '@/types'

const POST_SELECT = '*, feedback(*)'

/** Postgres returns feedback newest-insert-order isn't guaranteed; sort here. */
function sortFeedback(post: Post): Post {
  return {
    ...post,
    feedback: [...post.feedback].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1)),
  }
}

function nextMonth(month: string) {
  const [y, m] = month.split('-').map(Number)
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
}

async function unwrap<T>(
  promise: PromiseLike<{ data: T | null; error: { message: string } | null }>,
) {
  const { data, error } = await promise
  if (error) throw new Error(error.message)
  return data as T
}

export const api = {
  listPosts: async (workspace: WorkspaceId) => {
    const data = await unwrap<Post[]>(
      supabase.from('posts').select(POST_SELECT).eq('workspace', workspace).order('date'),
    )
    return data.map(sortFeedback)
  },

  /** Server-side month scoping — used by the public share page, which should
   *  never pull a whole workspace's history for one shared month. */
  listPostsForMonth: async (workspace: WorkspaceId, month: string) => {
    const data = await unwrap<Post[]>(
      supabase
        .from('posts')
        .select(POST_SELECT)
        .eq('workspace', workspace)
        .gte('date', `${month}-01`)
        .lt('date', `${nextMonth(month)}-01`)
        .order('date'),
    )
    return data.map(sortFeedback)
  },

  createPost: async (input: PostInput) => {
    const data = await unwrap<Post>(
      supabase.from('posts').insert(input).select(POST_SELECT).single(),
    )
    return sortFeedback(data)
  },

  updatePost: async (id: string, patch: Partial<PostInput>) => {
    const data = await unwrap<Post>(
      supabase
        .from('posts')
        .update({ ...patch, updatedAt: new Date().toISOString() })
        .eq('id', id)
        .select(POST_SELECT)
        .single(),
    )
    return sortFeedback(data)
  },

  deletePost: async (id: string) => {
    const { error } = await supabase.from('posts').delete().eq('id', id)
    if (error) throw new Error(error.message)
    return { id }
  },

  duplicatePost: async (id: string) => {
    const source = await unwrap<Post>(
      supabase.from('posts').select(POST_SELECT).eq('id', id).single(),
    )
    const {
      id: _id,
      feedback: _feedback,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      driveFileId: _driveFileId,
      driveStage: _driveStage,
      reviewedBy: _reviewedBy,
      completedAt: _completedAt,
      ...rest
    } = source
    const data = await unwrap<Post>(
      supabase
        .from('posts')
        .insert({ ...rest, title: `${source.title} (Copy)`, status: 'review' })
        .select(POST_SELECT)
        .single(),
    )
    return sortFeedback(data)
  },

  addFeedback: async (id: string, input: FeedbackInput, driveStage?: DriveStage) => {
    await unwrap(
      supabase.rpc('add_feedback', {
        p_post_id: id,
        p_author: input.author,
        p_role: input.role,
        p_kind: input.kind,
        p_message: input.message,
        p_status: input.status ?? null,
        p_drive_stage: driveStage ?? null,
      }),
    )
    const data = await unwrap<Post>(
      supabase.from('posts').select(POST_SELECT).eq('id', id).single(),
    )
    return sortFeedback(data)
  },

  createShare: async (month: string, slug: string, workspace: WorkspaceId) => {
    const id = `${workspace}-${slug}-${Math.random().toString(36).slice(2, 8)}`
    return unwrap<ShareLink>(
      supabase.from('shares').insert({ id, workspace, month }).select().single(),
    )
  },

  getShare: async (id: string) => {
    const { data, error } = await supabase.from('shares').select().eq('id', id).maybeSingle()
    if (error) throw new Error(error.message)
    return data as ShareLink | null
  },

  listTeamMembers: () => unwrap<TeamMember[]>(supabase.from('team_members').select().order('name')),

  createTeamMember: (input: TeamMemberInput) =>
    unwrap<TeamMember>(supabase.from('team_members').insert(input).select().single()),

  updateTeamMember: (id: string, patch: Partial<TeamMemberInput>) =>
    unwrap<TeamMember>(supabase.from('team_members').update(patch).eq('id', id).select().single()),

  deleteTeamMember: async (id: string) => {
    const { error } = await supabase.from('team_members').delete().eq('id', id)
    if (error) throw new Error(error.message)
    return { id }
  },

  renameAssignee: async (from: string, to: string) => {
    const { error } = await supabase.from('posts').update({ assignee: to }).eq('assignee', from)
    if (error) throw new Error(error.message)
  },

  listFolders: (workspace?: WorkspaceId) => {
    let query = supabase.from('folders').select().order('name')
    if (workspace) query = query.eq('workspace', workspace)
    return unwrap<DriveFolder[]>(query)
  },

  createFolder: (input: FolderInput) =>
    unwrap<DriveFolder>(supabase.from('folders').insert(input).select().single()),

  updateFolder: (id: string, patch: Partial<FolderInput>) =>
    unwrap<DriveFolder>(supabase.from('folders').update(patch).eq('id', id).select().single()),

  deleteFolder: async (id: string) => {
    const { error } = await supabase.from('folders').delete().eq('id', id)
    if (error) throw new Error(error.message)
    return { id }
  },

  listFiles: (workspace?: WorkspaceId) => {
    let query = supabase.from('files').select().order('createdAt', {
      ascending: false,
    })
    if (workspace) query = query.eq('workspace', workspace)
    return unwrap<DriveFile[]>(query)
  },

  createFile: (input: FileRecordInput) =>
    unwrap<DriveFile>(supabase.from('files').insert(input).select().single()),

  updateFile: (id: string, patch: Partial<FileRecordInput>) =>
    unwrap<DriveFile>(
      supabase
        .from('files')
        .update({ ...patch, updatedAt: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single(),
    ),

  deleteFile: async (id: string) => {
    const { error } = await supabase.from('files').delete().eq('id', id)
    if (error) throw new Error(error.message)
    return { id }
  },

  // --- Time Tracker ---------------------------------------------------------
  // Companies, projects and work items are small reference tables, so they're
  // fetched whole and joined client-side rather than through nested PostgREST
  // selects. That keeps one copy of the hierarchy in memory that the work-item
  // search, the pickers and every report all read from.

  listCompanies: () => unwrap<Company[]>(supabase.from('companies').select().order('name')),

  createCompany: (input: CompanyInput) =>
    unwrap<Company>(supabase.from('companies').insert(input).select().single()),

  updateCompany: (id: string, patch: Partial<CompanyInput>) =>
    unwrap<Company>(supabase.from('companies').update(patch).eq('id', id).select().single()),

  deleteCompany: async (id: string) => {
    const { error } = await supabase.from('companies').delete().eq('id', id)
    if (error) throw new Error(error.message)
    return { id }
  },

  listProjects: () => unwrap<Project[]>(supabase.from('projects').select().order('name')),

  createProject: (input: ProjectInput) =>
    unwrap<Project>(supabase.from('projects').insert(input).select().single()),

  updateProject: (id: string, patch: Partial<ProjectInput>) =>
    unwrap<Project>(supabase.from('projects').update(patch).eq('id', id).select().single()),

  deleteProject: async (id: string) => {
    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (error) throw new Error(error.message)
    return { id }
  },

  listWorkItems: () => unwrap<WorkItem[]>(supabase.from('work_items').select().order('name')),

  // `code` is omitted on purpose — Postgres assigns it from a sequence.
  createWorkItem: (input: WorkItemInput) =>
    unwrap<WorkItem>(supabase.from('work_items').insert(input).select().single()),

  updateWorkItem: (id: string, patch: Partial<WorkItemInput>) =>
    unwrap<WorkItem>(
      supabase
        .from('work_items')
        .update({ ...patch, updatedAt: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single(),
    ),

  deleteWorkItem: async (id: string) => {
    const { error } = await supabase.from('work_items').delete().eq('id', id)
    if (error) throw new Error(error.message)
    return { id }
  },

  listTimeEntries: () =>
    unwrap<TimeEntry[]>(
      supabase.from('time_entries').select().order('startTime', { ascending: false }),
    ),

  createTimeEntry: (input: TimeEntryInput) =>
    unwrap<TimeEntry>(supabase.from('time_entries').insert(input).select().single()),

  updateTimeEntry: (id: string, patch: Partial<TimeEntryInput>) =>
    unwrap<TimeEntry>(
      supabase
        .from('time_entries')
        .update({ ...patch, updatedAt: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single(),
    ),

  deleteTimeEntry: async (id: string) => {
    const { error } = await supabase.from('time_entries').delete().eq('id', id)
    if (error) throw new Error(error.message)
    return { id }
  },
}

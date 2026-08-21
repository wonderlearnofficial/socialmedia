import { supabase } from './supabaseClient'
import type {
  FeedbackInput,
  Post,
  PostInput,
  ShareLink,
  TeamMember,
  TeamMemberInput,
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
      ...rest
    } = source
    const data = await unwrap<Post>(
      supabase
        .from('posts')
        .insert({ ...rest, title: `${source.title} (Copy)`, status: 'draft' })
        .select(POST_SELECT)
        .single(),
    )
    return sortFeedback(data)
  },

  addFeedback: async (id: string, input: FeedbackInput) => {
    await unwrap(
      supabase.rpc('add_feedback', {
        p_post_id: id,
        p_author: input.author,
        p_role: input.role,
        p_kind: input.kind,
        p_message: input.message,
        p_status: input.status ?? null,
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

  listTeamMembers: (workspace: WorkspaceId) =>
    unwrap<TeamMember[]>(supabase.from('team_members').select().eq('workspace', workspace)),

  createTeamMember: (input: TeamMemberInput) =>
    unwrap<TeamMember>(supabase.from('team_members').insert(input).select().single()),
}

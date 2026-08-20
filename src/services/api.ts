import type { Post, PostInput, ShareLink } from '@/types'
import type { FeedbackInput } from './mockServer'
import { http } from './http'

export const api = {
  listPosts: () => http.get<Post[]>('/posts').then((r) => r.data),

  createPost: (input: PostInput) => http.post<Post>('/posts', input).then((r) => r.data),

  updatePost: (id: string, patch: Partial<PostInput>) =>
    http.patch<Post>(`/posts/${id}`, patch).then((r) => r.data),

  deletePost: (id: string) => http.delete<{ id: string }>(`/posts/${id}`).then((r) => r.data),

  duplicatePost: (id: string) => http.post<Post>(`/posts/${id}/duplicate`).then((r) => r.data),

  addFeedback: (id: string, input: FeedbackInput) =>
    http.post<Post>(`/posts/${id}/feedback`, input).then((r) => r.data),

  createShare: (month: string, slug: string) =>
    http.post<ShareLink>('/shares', { month, slug }).then((r) => r.data),

  getShare: (id: string) => http.get<ShareLink | null>(`/shares/${id}`).then((r) => r.data),
}

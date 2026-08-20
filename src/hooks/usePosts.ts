import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import type { FeedbackInput } from '@/services/mockServer'
import type { Post, PostInput } from '@/types'

export const postsKey = ['posts'] as const

export function usePostsQuery() {
  return useQuery({ queryKey: postsKey, queryFn: api.listPosts })
}

export function usePostById(id: string | null) {
  const { data } = usePostsQuery()
  return id ? (data?.find((p) => p.id === id) ?? null) : null
}

function useCacheReplace() {
  const qc = useQueryClient()
  return (post: Post) => {
    qc.setQueryData<Post[]>(postsKey, (old) =>
      old ? old.map((p) => (p.id === post.id ? post : p)) : [post],
    )
  }
}

export function useCreatePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: PostInput) => api.createPost(input),
    onSuccess: (post) => {
      qc.setQueryData<Post[]>(postsKey, (old) => (old ? [...old, post] : [post]))
    },
  })
}

export function useUpdatePost() {
  const replace = useCacheReplace()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<PostInput> }) =>
      api.updatePost(id, patch),
    onSuccess: replace,
  })
}

export function useDeletePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deletePost(id),
    onSuccess: ({ id }) => {
      qc.setQueryData<Post[]>(postsKey, (old) => old?.filter((p) => p.id !== id) ?? [])
    },
  })
}

export function useDuplicatePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.duplicatePost(id),
    onSuccess: (post) => {
      qc.setQueryData<Post[]>(postsKey, (old) => (old ? [...old, post] : [post]))
    },
  })
}

export function useAddFeedback() {
  const replace = useCacheReplace()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: FeedbackInput }) => api.addFeedback(id, input),
    onSuccess: replace,
  })
}

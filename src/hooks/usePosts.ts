import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { useAppSelector } from '@/store/hooks'
import type { FeedbackInput, PostInput } from '@/types'

export function usePostsQuery() {
  const workspace = useAppSelector((s) => s.settings.activeWorkspace)
  return useQuery({
    queryKey: ['posts', workspace],
    queryFn: () => api.listPosts(workspace),
  })
}

export function usePostById(id: string | null) {
  const { data } = usePostsQuery()
  return id ? (data?.find((p) => p.id === id) ?? null) : null
}

/** Every mutation refetches whichever workspace's posts query is mounted. */
function useInvalidatePosts() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ['posts'] })
}

export function useCreatePost() {
  const invalidate = useInvalidatePosts()
  return useMutation({
    mutationFn: (input: PostInput) => api.createPost(input),
    onSuccess: invalidate,
  })
}

export function useUpdatePost() {
  const invalidate = useInvalidatePosts()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<PostInput> }) =>
      api.updatePost(id, patch),
    onSuccess: invalidate,
  })
}

export function useDeletePost() {
  const invalidate = useInvalidatePosts()
  return useMutation({
    mutationFn: (id: string) => api.deletePost(id),
    onSuccess: invalidate,
  })
}

export function useDuplicatePost() {
  const invalidate = useInvalidatePosts()
  return useMutation({
    mutationFn: (id: string) => api.duplicatePost(id),
    onSuccess: invalidate,
  })
}

export function useAddFeedback() {
  const invalidate = useInvalidatePosts()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: FeedbackInput }) => api.addFeedback(id, input),
    onSuccess: invalidate,
  })
}

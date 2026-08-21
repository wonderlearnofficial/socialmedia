import { useMemo } from 'react'
import { filterPosts } from '@/lib/filtering'
import { useAppSelector } from '@/store/hooks'
import type { WorkspaceId } from '@/types'
import { usePostsQuery } from './usePosts'

/** All posts that pass the current platform/status/search filters. */
export function useVisiblePosts(workspaceOverride?: WorkspaceId) {
  const query = usePostsQuery(workspaceOverride)
  const filters = useAppSelector((s) => s.filters)
  const posts = useMemo(() => filterPosts(query.data ?? [], filters), [query.data, filters])
  return { ...query, posts }
}

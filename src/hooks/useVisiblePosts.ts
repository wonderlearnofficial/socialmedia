import { useMemo } from 'react'
import { filterPosts } from '@/lib/filtering'
import { useAppSelector } from '@/store/hooks'
import { usePostsQuery } from './usePosts'

/** All posts that pass the current platform/status/search filters. */
export function useVisiblePosts() {
  const query = usePostsQuery()
  const filters = useAppSelector((s) => s.filters)
  const posts = useMemo(() => filterPosts(query.data ?? [], filters), [query.data, filters])
  return { ...query, posts }
}

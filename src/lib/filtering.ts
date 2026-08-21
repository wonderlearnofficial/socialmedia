import { POST_STATUSES, type Post, type PostStatus, type SocialPlatform } from '@/types'

export interface PostFilters {
  platforms: SocialPlatform[]
  statuses: PostStatus[]
  search: string
}

export function filterPosts(posts: Post[], filters: PostFilters): Post[] {
  const q = filters.search.trim().toLowerCase()
  return posts.filter((post) => {
    if (
      filters.platforms.length > 0 &&
      !post.platforms.some((p) => filters.platforms.includes(p))
    ) {
      return false
    }
    if (filters.statuses.length > 0 && !filters.statuses.includes(post.status)) return false
    if (q) {
      const haystack = [post.title, post.description, post.topic, post.caption]
      if (!haystack.some((f) => f.toLowerCase().includes(q))) return false
    }
    return true
  })
}

export function sortPosts(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => (`${a.date}T${a.time}` < `${b.date}T${b.time}` ? -1 : 1))
}

export function postsForDay(posts: Post[], dateKey: string): Post[] {
  return sortPosts(posts.filter((p) => p.date === dateKey))
}

/** Posts within a given yyyy-MM month */
export function postsForMonth(posts: Post[], monthKey: string): Post[] {
  return posts.filter((p) => p.date.startsWith(monthKey))
}

export function countByStatus(posts: Post[]): Record<PostStatus, number> {
  const counts = Object.fromEntries(POST_STATUSES.map((s) => [s, 0])) as Record<PostStatus, number>
  for (const p of posts) counts[p.status] += 1
  return counts
}

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarDays } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatDayLong } from '@/lib/dates'
import { sortPosts } from '@/lib/filtering'
import type { Post } from '@/types'
import { PostRow } from './PostRow'

/** Grouped agenda: one section per day. Doubles as the mobile calendar. */
export function ListView({
  posts,
  onPostClick,
  onDayClick,
}: {
  posts: Post[]
  onPostClick: (id: string) => void
  onDayClick?: (dateKey: string) => void
}) {
  const { t, i18n } = useTranslation()

  const days = useMemo(() => {
    const byDay = new Map<string, Post[]>()
    for (const post of sortPosts(posts)) {
      const list = byDay.get(post.date)
      if (list) list.push(post)
      else byDay.set(post.date, [post])
    }
    return [...byDay.entries()]
  }, [posts])

  if (days.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title={t('calendar.emptyTitle')}
        body={t('calendar.emptyBody')}
      />
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-5">
      {days.map(([dateKey, dayPosts]) => (
        <section key={dateKey}>
          <div className="sticky top-0 z-10 -mx-1 mb-2 flex items-baseline gap-2 bg-card/95 px-1 py-1.5 backdrop-blur">
            <button
              type="button"
              onClick={() => onDayClick?.(dateKey)}
              className="text-sm font-semibold tracking-tight hover:underline"
            >
              {formatDayLong(dateKey, i18n.language)}
            </button>
            <span className="text-xs text-muted-foreground">
              {t('calendar.postsPlanned', { count: dayPosts.length })}
            </span>
          </div>
          <div className="space-y-2">
            {dayPosts.map((post) => (
              <PostRow key={post.id} post={post} onClick={() => onPostClick(post.id)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

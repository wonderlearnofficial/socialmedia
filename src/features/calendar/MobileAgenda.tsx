import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { CalendarDays } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { usePrefersReducedMotion } from '@/hooks/useReducedMotion'
import { formatDayLong, toDateKey } from '@/lib/dates'
import { sortPosts } from '@/lib/filtering'
import { cn } from '@/lib/utils'
import type { Post } from '@/types'
import { PostRow } from './PostRow'

/**
 * Mobile replaces the grid with a clean agenda — the desktop month grid is
 * unreadable at this width.
 */
export function MobileAgenda({
  posts,
  monthKey,
  onPostClick,
}: {
  posts: Post[]
  /** yyyy-MM currently in view */
  monthKey: string
  onPostClick: (id: string) => void
}) {
  const { t, i18n } = useTranslation()
  const reduceMotion = usePrefersReducedMotion()
  const todayKey = toDateKey(new Date())

  const days = useMemo(() => {
    const byDay = new Map<string, Post[]>()
    for (const post of sortPosts(posts.filter((p) => p.date.startsWith(monthKey)))) {
      const list = byDay.get(post.date)
      if (list) list.push(post)
      else byDay.set(post.date, [post])
    }
    return [...byDay.entries()]
  }, [posts, monthKey])

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
    <div className="space-y-5 p-4">
      {days.map(([dateKey, dayPosts], index) => (
        <motion.section
          key={dateKey}
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, delay: Math.min(index * 0.02, 0.2) }}
        >
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h3
              className={cn(
                'text-sm font-semibold tracking-tight',
                dateKey === todayKey && 'text-primary',
              )}
            >
              {formatDayLong(dateKey, i18n.language)}
            </h3>
            <span className="text-[11px] text-muted-foreground">
              {t('calendar.postsPlanned', { count: dayPosts.length })}
            </span>
          </div>
          <div className="space-y-2">
            {dayPosts.map((post) => (
              <PostRow key={post.id} post={post} onClick={() => onPostClick(post.id)} />
            ))}
          </div>
        </motion.section>
      ))}
    </div>
  )
}

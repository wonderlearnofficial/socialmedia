import { useTranslation } from 'react-i18next'
import { STATUS_META } from '@/lib/constants'
import { countByStatus } from '@/lib/filtering'
import { cn } from '@/lib/utils'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setStatuses } from '@/store/slices/filtersSlice'
import { POST_STATUSES, type Post } from '@/types'

/**
 * The small summary strip above the calendar. Each number is a filter —
 * clicking narrows the calendar to that status. Kept as plain text, not
 * bordered stat tiles, so it stays a caption to the calendar rather than
 * a dashboard fighting it for attention.
 */
export function CalendarSummary({ posts, className }: { posts: Post[]; className?: string }) {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const active = useAppSelector((s) => s.filters.statuses)
  const counts = countByStatus(posts)
  const visible = POST_STATUSES.filter((s) => counts[s] > 0)

  return (
    <div className={cn('flex flex-wrap items-center gap-x-5 gap-y-2', className)}>
      <button
        type="button"
        onClick={() => dispatch(setStatuses([]))}
        className={cn(
          'flex items-baseline gap-1.5 rounded-sm text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
          active.length > 0 && 'text-muted-foreground hover:text-foreground',
        )}
      >
        <span className="text-lg font-semibold leading-none tracking-tight tabular-nums">
          {posts.length}
        </span>
        <span className="text-xs text-muted-foreground">{t('summary.posts')}</span>
      </button>

      {visible.map((status) => {
        const isActive = active.includes(status)
        const meta = STATUS_META[status]
        return (
          <button
            key={status}
            type="button"
            onClick={() =>
              dispatch(setStatuses(isActive ? active.filter((s) => s !== status) : [status]))
            }
            aria-pressed={isActive}
            className={cn(
              'flex items-baseline gap-1.5 rounded-sm text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
              !isActive && 'text-muted-foreground hover:text-foreground',
            )}
          >
            <span className="text-lg font-semibold leading-none tracking-tight tabular-nums">
              {counts[status]}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn('size-1.5 rounded-full', meta.dot)} />
              {t(meta.labelKey)}
            </span>
          </button>
        )
      })}
    </div>
  )
}

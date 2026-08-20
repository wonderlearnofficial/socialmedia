import { useTranslation } from 'react-i18next'
import { STATUS_META } from '@/lib/constants'
import { countByStatus } from '@/lib/filtering'
import { cn } from '@/lib/utils'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setStatuses } from '@/store/slices/filtersSlice'
import { POST_STATUSES, type Post } from '@/types'

/**
 * The small summary strip above the calendar. Each number is a filter —
 * clicking narrows the calendar to that status.
 */
export function CalendarSummary({ posts, className }: { posts: Post[]; className?: string }) {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const active = useAppSelector((s) => s.filters.statuses)
  const counts = countByStatus(posts)
  const visible = POST_STATUSES.filter((s) => counts[s] > 0)

  return (
    <div className={cn('flex flex-wrap items-stretch gap-2', className)}>
      <button
        type="button"
        onClick={() => dispatch(setStatuses([]))}
        className={cn(
          'flex min-w-24 flex-col rounded-lg border px-3 py-2 text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
          active.length === 0 ? 'border-primary/50 bg-primary/5' : 'hover:bg-accent',
        )}
      >
        <span className="text-lg font-semibold leading-none tracking-tight tabular-nums">
          {posts.length}
        </span>
        <span className="mt-1 text-[11px] text-muted-foreground">{t('summary.posts')}</span>
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
              'flex min-w-24 flex-col rounded-lg border px-3 py-2 text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
              isActive ? 'border-primary/50 bg-primary/5' : 'hover:bg-accent',
            )}
          >
            <span className="text-lg font-semibold leading-none tracking-tight tabular-nums">
              {counts[status]}
            </span>
            <span className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className={cn('size-1.5 rounded-full', meta.dot)} />
              {t(meta.labelKey)}
            </span>
          </button>
        )
      })}
    </div>
  )
}

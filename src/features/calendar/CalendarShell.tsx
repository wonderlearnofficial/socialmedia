import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import { addMonths, addWeeks, parseISO } from 'date-fns'
import { CalendarX2, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { usePrefersReducedMotion } from '@/hooks/useReducedMotion'
import { toDateKey, toMonthKey } from '@/lib/dates'
import { postsForMonth } from '@/lib/filtering'
import { cn } from '@/lib/utils'
import type { CalendarViewMode } from '@/store/slices/viewSlice'
import type { Post } from '@/types'
import { CalendarGrid } from './CalendarGrid'
import { CalendarHeader } from './CalendarHeader'
import { CalendarSkeleton, ListSkeleton } from './CalendarSkeleton'
import { FilterBar } from './FilterBar'
import { ListView } from './ListView'
import { MobileAgenda } from './MobileAgenda'

interface CalendarShellProps {
  posts: Post[]
  /** Unfiltered set, used to decide between "no posts" and "no matches". */
  allPosts: Post[]
  date: Date
  view: CalendarViewMode
  isLoading?: boolean
  isError?: boolean
  onRetry?: () => void
  onDateChange: (date: Date) => void
  onViewChange: (view: CalendarViewMode) => void
  onDayClick: (dateKey: string) => void
  onPostClick: (id: string) => void
  onPostDrop?: (postId: string, dateKey: string, time: string) => Promise<void> | void
  onShare?: () => void
  onAddPost?: (dateKey?: string) => void
  readOnly?: boolean
  filterCount?: number
  className?: string
}

/**
 * The calendar surface: header, optional filters, and whichever view is active.
 * Shared by the manager dashboard and the client review page.
 */
export function CalendarShell({
  posts,
  allPosts,
  date,
  view,
  isLoading,
  isError,
  onRetry,
  onDateChange,
  onViewChange,
  onDayClick,
  onPostClick,
  onPostDrop,
  onShare,
  onAddPost,
  readOnly = false,
  filterCount = 0,
  className,
}: CalendarShellProps) {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const reduceMotion = usePrefersReducedMotion()
  const [filtersOpen, setFiltersOpen] = useState(false)

  const monthKey = toMonthKey(date)
  const monthPosts = useMemo(() => postsForMonth(posts, monthKey), [posts, monthKey])
  const monthHasAny = useMemo(
    () => postsForMonth(allPosts, monthKey).length > 0,
    [allPosts, monthKey],
  )

  const step = view === 'week' ? 1 : 1
  const goPrev = () =>
    onDateChange(view === 'week' ? addWeeks(date, -step) : addMonths(date, -step))
  const goNext = () => onDateChange(view === 'week' ? addWeeks(date, step) : addMonths(date, step))

  // Mobile collapses to the agenda regardless of the selected view.
  const effectiveView: CalendarViewMode = isMobile && view !== 'list' ? 'list' : view
  const usesGrid = !isMobile && (view === 'month' || view === 'week')

  const body = () => {
    if (isError) {
      return (
        <EmptyState
          icon={TriangleAlert}
          title={t('calendar.loadErrorTitle')}
          body={t('calendar.loadErrorBody')}
          action={
            onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry}>
                {t('calendar.retry')}
              </Button>
            )
          }
        />
      )
    }

    if (isLoading) return usesGrid ? <CalendarSkeleton /> : <ListSkeleton />

    // Nothing at all this month vs. filtered to nothing — different messages.
    if (monthPosts.length === 0 && !usesGrid) {
      return (
        <EmptyState
          icon={CalendarX2}
          title={monthHasAny ? t('calendar.emptyTitle') : t('calendar.noPostsDay')}
          body={monthHasAny ? t('calendar.emptyBody') : undefined}
          action={
            !readOnly && onAddPost ? (
              <Button size="sm" onClick={() => onAddPost(toDateKey(date))}>
                {t('calendar.addToDay')}
              </Button>
            ) : undefined
          }
        />
      )
    }

    if (usesGrid) {
      return (
        <CalendarGrid
          posts={posts}
          date={date}
          view={view === 'week' ? 'week' : 'month'}
          onDayClick={onDayClick}
          onPostClick={onPostClick}
          onPostDrop={onPostDrop}
          onDatesChange={(next) => {
            // Only sync when the month actually changed, to avoid a feedback loop.
            if (toMonthKey(next) !== toMonthKey(date)) onDateChange(next)
          }}
          editable={!readOnly}
        />
      )
    }

    if (isMobile) {
      return <MobileAgenda posts={posts} monthKey={monthKey} onPostClick={onPostClick} />
    }

    return <ListView posts={monthPosts} onPostClick={onPostClick} onDayClick={onDayClick} />
  }

  return (
    <div
      className={cn('flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card', className)}
    >
      <CalendarHeader
        date={date}
        view={effectiveView}
        onPrev={goPrev}
        onNext={goNext}
        onToday={() => onDateChange(new Date())}
        onViewChange={onViewChange}
        onShare={onShare}
        onAddPost={onAddPost ? () => onAddPost(toDateKey(date)) : undefined}
        onToggleFilters={() => setFiltersOpen((o) => !o)}
        filtersOpen={filtersOpen}
        filterCount={filterCount}
        readOnly={readOnly}
      />

      <AnimatePresence initial={false}>
        {filtersOpen && (
          <motion.div
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-b"
          >
            <FilterBar className="p-3 sm:px-4" />
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className={cn(
          'min-h-0 flex-1',
          // Week view manages its own internal scrolling; everything else scrolls here.
          usesGrid && view === 'week' ? 'overflow-hidden' : 'overflow-y-auto',
        )}
      >
        {body()}
      </div>
    </div>
  )
}

export { parseISO }

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Eye, Link2Off } from 'lucide-react'
import { BrandLockup } from '@/components/shared/Brand'
import { EmptyState } from '@/components/shared/EmptyState'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { Skeleton } from '@/components/ui/skeleton'
import { CalendarShell } from '@/features/calendar/CalendarShell'
import { CalendarSummary } from '@/features/calendar/CalendarSummary'
import { DayDetailsModal } from '@/features/calendar/DayDetailsModal'
import { PostDetailsDrawer } from '@/features/posts/PostDetailsDrawer'
import { WORKSPACE_META } from '@/lib/constants'
import { formatMonthTitle } from '@/lib/dates'
import { api } from '@/services/api'
import type { CalendarViewMode } from '@/store/slices/viewSlice'

/**
 * Review mode. Reached only through a share link: no sidebar, no authoring,
 * no internal assignee data — just the plan and the two decisions the owner owns.
 *
 * The visiting browser has no workspace of its own (no switcher, no session),
 * so posts are fetched scoped to whatever workspace the share record itself
 * carries — never the viewer's local settings, which default to Wonderlearn
 * regardless of which client's link they actually opened.
 */
export function SharedCalendarPage() {
  const { t, i18n } = useTranslation()
  const { shareId = '' } = useParams()

  const [view, setView] = useState<CalendarViewMode>('month')
  const [date, setDate] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)

  const share = useQuery({
    queryKey: ['share', shareId],
    queryFn: () => api.getShare(shareId),
    enabled: Boolean(shareId),
  })

  const workspace = share.data?.workspace
  const month = share.data?.month
  const {
    data: posts = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['posts', workspace, month],
    queryFn: () => api.listPostsForMonth(workspace!, month!),
    enabled: Boolean(workspace && month),
  })
  const activePost = posts.find((p) => p.id === activeId) ?? null

  // A shared post link (?post=<id>) opens straight into that post.
  const [searchParams, setSearchParams] = useSearchParams()
  const linkedPostId = searchParams.get('post')
  useEffect(() => {
    if (!linkedPostId) return
    setActiveId(linkedPostId)
    searchParams.delete('post')
    setSearchParams(searchParams, { replace: true })
  }, [linkedPostId, searchParams, setSearchParams])

  // Land the owner on the month that was actually shared.
  useEffect(() => {
    if (share.data?.month) setDate(new Date(`${share.data.month}-01T12:00:00`))
  }, [share.data?.month])

  if (share.isLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-4 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[70vh] rounded-xl" />
      </div>
    )
  }

  if (!share.data) {
    return (
      <div className="grid min-h-dvh place-items-center p-6">
        <EmptyState icon={Link2Off} title={t('share.invalidTitle')} body={t('share.invalidBody')} />
      </div>
    )
  }

  const workspaceLabel = WORKSPACE_META[share.data.workspace].label

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <header className="shrink-0 border-b">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-3 px-4 sm:px-6">
          <BrandLockup size="sm" />
          <span className="ms-auto inline-flex items-center gap-1.5 rounded-full border bg-muted/50 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            <Eye className="size-3" />
            {t('review.reviewMode')}
          </span>
          <ThemeToggle />
        </div>
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-4 p-4 sm:p-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {t('share.sharedTitle')}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {formatMonthTitle(date, i18n.language)} ·{' '}
            {t('share.sharedBy', { workspace: workspaceLabel })}
          </p>
        </div>

        <p className="rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
          {t('review.clientBanner')}
        </p>

        <CalendarSummary posts={posts} />

        <div className="flex min-h-0 flex-1">
          <CalendarShell
            className="flex-1"
            posts={posts}
            allPosts={posts}
            date={date}
            view={view}
            isLoading={isLoading}
            isError={isError}
            onRetry={() => refetch()}
            onDateChange={setDate}
            onViewChange={setView}
            onDayClick={setSelectedDay}
            onPostClick={setActiveId}
            readOnly
          />
        </div>
      </div>

      <DayDetailsModal
        dateKey={selectedDay}
        posts={posts}
        onClose={() => setSelectedDay(null)}
        onPostClick={setActiveId}
      />

      <PostDetailsDrawer
        post={activePost}
        open={Boolean(activePost)}
        onClose={() => setActiveId(null)}
        reviewer={{ name: workspaceLabel, role: 'owner' }}
        readOnly
      />
    </div>
  )
}

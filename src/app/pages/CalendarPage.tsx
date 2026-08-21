import { useCallback, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import gsap from 'gsap'
import { PageHeader } from '@/components/layout/PageHeader'
import { CalendarShell } from '@/features/calendar/CalendarShell'
import { CalendarSummary } from '@/features/calendar/CalendarSummary'
import { DayDetailsModal } from '@/features/calendar/DayDetailsModal'
import { PostDetailsDrawer } from '@/features/posts/PostDetailsDrawer'
import { PostEditor } from '@/features/posts/PostEditor'
import { ShareCalendarModal } from '@/features/sharing/ShareCalendarModal'
import { usePostById, useUpdatePost } from '@/hooks/usePosts'
import { useVisiblePosts } from '@/hooks/useVisiblePosts'
import { usePrefersReducedMotion } from '@/hooks/useReducedMotion'
import { formatDateShort, formatMonthTitle, toMonthKey } from '@/lib/dates'
import { postsForMonth } from '@/lib/filtering'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setActiveWorkspace } from '@/store/slices/settingsSlice'
import {
  closeDay,
  closeEditor,
  closePost,
  openDay,
  openEditor,
  openPost,
  setDateISO,
  setShareOpen,
  setView,
} from '@/store/slices/viewSlice'
import type { WorkspaceId } from '@/types'

interface CalendarPageProps {
  workspace?: WorkspaceId
}

export function CalendarPage({ workspace = 'wonderlearn' }: CalendarPageProps) {
  const { t, i18n } = useTranslation()
  const dispatch = useAppDispatch()
  const reduceMotion = usePrefersReducedMotion()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    dispatch(setActiveWorkspace(workspace))
  }, [workspace, dispatch])

  const { posts, data: allPosts, isLoading, isError, refetch } = useVisiblePosts(workspace)
  const { view, dateISO, selectedDay, activePostId, editor, shareOpen } = useAppSelector(
    (s) => s.view,
  )
  const filters = useAppSelector((s) => s.filters)
  const date = new Date(dateISO)
  const monthKey = toMonthKey(date)

  const isDrWael = workspace === 'dr_wael'
  const title = isDrWael ? t('nav.drWael') : t('nav.socialMedia')
  const subtitle = isDrWael
    ? t('calendar.drWaelSubtitle', { month: formatMonthTitle(date, i18n.language) })
    : t('calendar.socialMediaSubtitle', { month: formatMonthTitle(date, i18n.language) })

  // A shared post link (?post=<id>) opens straight into that post.
  const [searchParams, setSearchParams] = useSearchParams()
  const linkedPostId = searchParams.get('post')
  useEffect(() => {
    if (!linkedPostId) return
    dispatch(openPost(linkedPostId))
    searchParams.delete('post')
    setSearchParams(searchParams, { replace: true })
  }, [linkedPostId, dispatch, searchParams, setSearchParams])

  const activePost = usePostById(activePostId, workspace)
  const editingPost = usePostById(editor.postId, workspace)
  const updatePost = useUpdatePost()

  const monthPosts = postsForMonth(posts, monthKey)
  const filterCount = filters.platforms.length + filters.statuses.length + (filters.search ? 1 : 0)

  // Entrance animation for the page chrome.
  useEffect(() => {
    if (reduceMotion || !containerRef.current) return
    const ctx = gsap.context(() => {
      gsap.from('[data-animate="header"]', {
        opacity: 0,
        y: -8,
        duration: 0.35,
        ease: 'power2.out',
      })
      gsap.from('[data-animate="summary"] > *', {
        opacity: 0,
        y: 8,
        duration: 0.3,
        stagger: 0.03,
        delay: 0.05,
        ease: 'power2.out',
      })
      gsap.from('[data-animate="calendar"]', {
        opacity: 0,
        y: 10,
        duration: 0.4,
        delay: 0.1,
        ease: 'power2.out',
      })
    }, containerRef)
    return () => ctx.revert()
  }, [reduceMotion])

  const handleReschedule = useCallback(
    async (postId: string, dateKey: string, time: string) => {
      try {
        await updatePost.mutateAsync({ id: postId, patch: { date: dateKey, time } })
        toast.success(t('calendar.rescheduled', { date: formatDateShort(dateKey, i18n.language) }))
      } catch (err) {
        toast.error(t('calendar.rescheduleError'))
        throw err
      }
    },
    [updatePost, t, i18n.language],
  )

  return (
    <div ref={containerRef} className="flex h-full flex-col gap-4 p-4 sm:p-5 lg:p-6">
      <div data-animate="header">
        <PageHeader title={title} subtitle={subtitle} />
      </div>

      <div data-animate="summary" className="shrink-0">
        <CalendarSummary posts={monthPosts} />
      </div>

      <div data-animate="calendar" className="flex min-h-0 flex-1">
        <CalendarShell
          className="flex-1"
          posts={posts}
          allPosts={allPosts ?? []}
          date={date}
          view={view}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          onDateChange={(next) => dispatch(setDateISO(next.toISOString()))}
          onViewChange={(next) => dispatch(setView(next))}
          onDayClick={(dateKey) => dispatch(openDay(dateKey))}
          onPostClick={(id) => dispatch(openPost(id))}
          onPostDrop={handleReschedule}
          onShare={() => dispatch(setShareOpen(true))}
          onAddPost={(dateKey) => dispatch(openEditor({ presetDate: dateKey }))}
          filterCount={filterCount}
        />
      </div>

      <DayDetailsModal
        dateKey={selectedDay}
        posts={posts}
        onClose={() => dispatch(closeDay())}
        onPostClick={(id) => dispatch(openPost(id))}
        onAddPost={(dateKey) => {
          dispatch(closeDay())
          dispatch(openEditor({ presetDate: dateKey }))
        }}
      />

      <PostDetailsDrawer
        post={activePost}
        open={Boolean(activePost)}
        onClose={() => dispatch(closePost())}
        onEdit={(id) => {
          dispatch(closePost())
          dispatch(openEditor({ postId: id }))
        }}
      />

      <PostEditor
        open={editor.open}
        post={editingPost}
        presetDate={editor.presetDate}
        presetTime={editor.presetTime}
        onClose={() => dispatch(closeEditor())}
      />

      <ShareCalendarModal
        open={shareOpen}
        month={date}
        onClose={() => dispatch(setShareOpen(false))}
      />
    </div>
  )
}

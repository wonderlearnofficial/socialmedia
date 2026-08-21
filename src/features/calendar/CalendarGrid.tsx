import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventClickArg, EventDropArg, EventInput } from '@fullcalendar/core'
import type { DateClickArg } from '@fullcalendar/interaction'
import arLocale from '@fullcalendar/core/locales/ar'
import gsap from 'gsap'
import { usePrefersReducedMotion } from '@/hooks/useReducedMotion'
import { toDateKey } from '@/lib/dates'
import type { Post } from '@/types'
import { CalendarPost } from './CalendarPost'

interface CalendarGridProps {
  posts: Post[]
  date: Date
  view: 'month' | 'week'
  onDayClick: (dateKey: string) => void
  onPostClick: (postId: string) => void
  onPostDrop?: (postId: string, dateKey: string, time: string) => Promise<void> | void
  onDatesChange?: (date: Date) => void
  /** Review mode disables rescheduling. */
  editable?: boolean
}

export function CalendarGrid({
  posts,
  date,
  view,
  onDayClick,
  onPostClick,
  onPostDrop,
  onDatesChange,
  editable = true,
}: CalendarGridProps) {
  const { i18n } = useTranslation()
  const calendarRef = useRef<FullCalendar>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const reduceMotion = usePrefersReducedMotion()

  const events: EventInput[] = posts.map((post) => ({
    id: post.id,
    title: post.title,
    start: `${post.date}T${post.time}:00`,
    allDay: false,
    extendedProps: { post },
  }))

  // Keep FullCalendar's internal date/view in sync with the app's state.
  // These must be passive effects: the connector calls flushSync internally,
  // which React rejects if it happens during the commit phase.
  useEffect(() => {
    const api = calendarRef.current?.getApi()
    if (!api) return
    if (toDateKey(api.getDate()) !== toDateKey(date)) api.gotoDate(date)
  }, [date])

  useEffect(() => {
    const api = calendarRef.current?.getApi()
    if (!api) return
    const target = view === 'month' ? 'dayGridMonth' : 'timeGridWeek'
    if (api.view.type !== target) api.changeView(target)
  }, [view])

  // Subtle month-transition: the grid fades and lifts into place.
  useEffect(() => {
    if (reduceMotion || !containerRef.current) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.fc-daygrid-body, .fc-timegrid-body',
        { opacity: 0, y: 6 },
        { opacity: 1, y: 0, duration: 0.28, ease: 'power2.out' },
      )
      gsap.fromTo(
        '.fc-daygrid-event-harness, .fc-timegrid-event-harness',
        { opacity: 0, y: 4 },
        { opacity: 1, y: 0, duration: 0.22, ease: 'power1.out', stagger: 0.004, delay: 0.05 },
      )
    }, containerRef)
    return () => ctx.revert()
  }, [date, view, posts.length, reduceMotion])

  const handleEventClick = (arg: EventClickArg) => {
    arg.jsEvent.preventDefault()
    arg.jsEvent.stopPropagation()
    onPostClick(arg.event.id)
  }

  const handleDateClick = (arg: DateClickArg) => onDayClick(arg.dateStr.slice(0, 10))

  const handleEventDrop = async (arg: EventDropArg) => {
    const start = arg.event.start
    if (!start || !onPostDrop) {
      arg.revert()
      return
    }
    const dateKey = toDateKey(start)
    const post = arg.event.extendedProps.post as Post | undefined
    // In month view, keep the post's existing scheduled time so moving between days
    // doesn't reset or shift hours unexpectedly. In week view, use the target time slot.
    const time =
      view === 'month' && post?.time
        ? post.time
        : `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`

    try {
      await onPostDrop(arg.event.id, dateKey, time)
    } catch {
      arg.revert()
    }
  }

  return (
    <div ref={containerRef} className="h-full">
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={view === 'month' ? 'dayGridMonth' : 'timeGridWeek'}
        initialDate={date}
        headerToolbar={false}
        // Month rows have a min-height, so let the grid grow and let the
        // surrounding card scroll; the time grid scrolls internally instead.
        height={view === 'month' ? 'auto' : '100%'}
        firstDay={1}
        locale={i18n.language === 'ar' ? arLocale : 'en'}
        direction={i18n.dir()}
        events={events}
        editable={editable}
        eventStartEditable={editable}
        eventDurationEditable={false}
        droppable={false}
        dayMaxEvents={3}
        moreLinkClick={(arg) => {
          onDayClick(toDateKey(arg.date))
          return 'none'
        }}
        moreLinkContent={(arg) => `+${arg.num} more`}
        eventClick={handleEventClick}
        dateClick={handleDateClick}
        eventDrop={handleEventDrop}
        datesSet={(arg) => {
          // For month view FullCalendar reports the padded range; use the mid-point.
          const mid = new Date((arg.start.getTime() + arg.end.getTime()) / 2)
          onDatesChange?.(view === 'month' ? mid : arg.start)
        }}
        eventContent={(arg) => (
          <CalendarPost post={arg.event.extendedProps.post as Post} compact={view === 'week'} />
        )}
        slotMinTime="06:00:00"
        slotMaxTime="24:00:00"
        // Posts scheduled at the same minute sit side by side rather than
        // stacking on top of each other, which made their titles collide.
        slotEventOverlap={false}
        allDaySlot={false}
        nowIndicator
        expandRows={view !== 'month'}
        stickyHeaderDates
      />
    </div>
  )
}

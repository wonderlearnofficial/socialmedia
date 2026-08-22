import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  ActiveTasksWidget,
  CalendarWidget,
  PrayerNotifyBell,
  PrayerWidget,
  QuickActionsWidget,
  StatsWidget,
  TrackerWidget,
  useHomeLayout,
  WidgetShell,
  type WidgetId,
} from '@/features/home/HomeWidgets'
import { useSession } from '@/hooks/useSession'

/**
 * Home — the landing dashboard. A normal page inside the shell, like every
 * other page: greeting, live clock, last sign-in, and the three widgets
 * (tracker · calendar · prayer), reorderable and hideable per user.
 */
export function HomePage() {
  const { t, i18n } = useTranslation()
  const { displayName, session } = useSession()
  const { layout, move, hide, show } = useHomeLayout()
  const [clock, setClock] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setClock(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const hour = clock.getHours()
  const greetingKey =
    hour < 5
      ? 'home.workingLate'
      : hour < 12
        ? 'home.goodMorning'
        : hour < 17
          ? 'home.goodAfternoon'
          : 'home.goodEvening'
  const firstName = (displayName || t('common.manager')).split(' ').slice(0, 2).join(' ')

  const lastSignIn = session?.user.last_sign_in_at
  const lastSignInText = lastSignIn ? relativeDay(new Date(lastSignIn), i18n.language) : null

  const widgetTitle: Record<WidgetId, string> = {
    tracker: t('home.trackerTitle'),
    stats: t('home.statsTitle'),
    tasks: t('home.tasksTitle'),
    calendar: t('home.calendarTitle'),
    prayer: t('home.prayerTitle'),
    quickActions: t('home.quickActionsTitle'),
  }

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-5 lg:p-6">
      <div className="mx-auto max-w-[1100px] space-y-5">
        <PageHeader
          title={t(greetingKey, { name: firstName })}
          subtitle={
            `${clock.toLocaleDateString(i18n.language, { weekday: 'long', month: 'long', day: 'numeric' })}` +
            (lastSignInText ? ` · ${t('home.lastSignedIn', { when: lastSignInText })}` : '')
          }
          actions={
            <div className="flex items-center gap-3">
              {/* Visual chrome only — hidden from screen readers so nothing
                  announces every second. */}
              <p
                aria-hidden
                className="hidden font-mono text-2xl tabular-nums text-muted-foreground sm:block"
              >
                {clock.toLocaleTimeString(i18n.language, {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </p>
              <PrayerNotifyBell />
            </div>
          }
        />

        {layout.hidden.length > 0 && (
          <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {t('home.hidden')}
            {layout.hidden.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => show(id)}
                className="rounded-full border px-2 py-0.5 text-foreground/80 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                + {widgetTitle[id] ?? id}
              </button>
            ))}
          </p>
        )}

        {/* A row-grid leaves a card's neighbors stuck at its height — a short
            Time Tracker next to a tall Calendar reads as a wall of empty
            space. Columns pack each card to its own height instead, so
            nothing sits next to more blank space than its own content. */}
        <div className="columns-1 gap-4 lg:columns-2 xl:columns-3">
          {layout.order
            .filter((id) => !layout.hidden.includes(id))
            .map((id, i, visible) => (
              <div key={id} className="mb-4 break-inside-avoid">
                <WidgetShell
                  title={widgetTitle[id] ?? id}
                  onHide={() => hide(id)}
                  onUp={i > 0 ? () => move(id, -1) : undefined}
                  onDown={i < visible.length - 1 ? () => move(id, 1) : undefined}
                >
                  {id === 'tracker' && <TrackerWidget />}
                  {id === 'stats' && <StatsWidget />}
                  {id === 'tasks' && <ActiveTasksWidget />}
                  {id === 'calendar' && <CalendarWidget />}
                  {id === 'prayer' && <PrayerWidget />}
                  {id === 'quickActions' && <QuickActionsWidget />}
                </WidgetShell>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

function relativeDay(d: Date, lang: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const that = new Date(d)
  that.setHours(0, 0, 0, 0)
  const diff = Math.round((today.getTime() - that.getTime()) / 86400000)
  const time = d.toLocaleTimeString(lang, { hour: 'numeric', minute: '2-digit' })
  if (diff === 0) return time
  if (diff === 1) return `${d.toLocaleDateString(lang, { weekday: 'long' })} · ${time}`
  return `${d.toLocaleDateString(lang, { month: 'short', day: 'numeric' })} · ${time}`
}

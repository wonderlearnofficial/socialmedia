/**
 * Home dashboard widgets. A normal feature module styled like every other
 * page — no private token system, just the app theme.
 *
 * The tracker widget shares state with the Time Tracker page by importing the
 * same hooks; the calendar dots come from real time entries in the shared
 * company palette; prayer times are on by default and their data never leaves
 * this device (localStorage only — by construction they cannot appear in team
 * views, reports, or exports).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Bell,
  BellOff,
  CalendarPlus,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  CloudSun,
  EyeOff,
  MapPin,
  Moon,
  MoonStar,
  Play,
  Square,
  Sun,
  Sunrise,
  Sunset,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TimeEntryDialog } from '@/features/time/TimeEntryDialog'
import { useActiveTimer, useNow } from '@/features/time/useActiveTimer'
import { useTimeData } from '@/features/time/useTimeData'
import { formatShare, validSeconds } from '@/features/time/integrity'
import { WorkItemSelector } from '@/features/time/WorkItemSelector'
import { usePostsQuery } from '@/hooks/usePosts'
import { entrySeconds, formatDuration, formatHoursMinutes } from '@/lib/time'
import { cn } from '@/lib/utils'
import { mockPrayerMonth, PRAYERS, type PrayerDay, type PrayerName } from './prayer'

// ── layout persistence ───────────────────────────────────────────────────────

export type WidgetId = 'tracker' | 'stats' | 'tasks' | 'calendar' | 'prayer' | 'quickActions'
const LAYOUT_KEY = 'wl.home.layout'
const DEFAULT_ORDER: WidgetId[] = [
  'tracker',
  'stats',
  'tasks',
  'prayer',
  'calendar',
  'quickActions',
]

export function useHomeLayout() {
  const [layout, setLayout] = useState<{ order: WidgetId[]; hidden: WidgetId[] }>(() => {
    try {
      const raw = localStorage.getItem(LAYOUT_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as { order: WidgetId[]; hidden: WidgetId[] }
        // Widgets added after a layout was already saved (e.g. this redesign)
        // need to show up somewhere rather than vanish for returning users.
        const missing = DEFAULT_ORDER.filter((id) => !parsed.order.includes(id))
        return { order: [...parsed.order, ...missing], hidden: parsed.hidden }
      }
    } catch {
      /* defaults below */
    }
    return { order: DEFAULT_ORDER, hidden: [] }
  })

  useEffect(() => {
    try {
      localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout))
    } catch {
      /* fine — layout just won't persist */
    }
  }, [layout])

  const move = (id: WidgetId, dir: -1 | 1) =>
    setLayout((l) => {
      const order = [...l.order]
      const i = order.indexOf(id)
      const j = i + dir
      if (j < 0 || j >= order.length) return l
      ;[order[i], order[j]] = [order[j], order[i]]
      return { ...l, order }
    })
  const hide = (id: WidgetId) => setLayout((l) => ({ ...l, hidden: [...l.hidden, id] }))
  const show = (id: WidgetId) =>
    setLayout((l) => ({ ...l, hidden: l.hidden.filter((x) => x !== id) }))

  return { layout, move, hide, show }
}

export function WidgetShell({
  title,
  children,
  onHide,
  onUp,
  onDown,
}: {
  title: string
  children: React.ReactNode
  onHide: () => void
  onUp?: () => void
  onDown?: () => void
}) {
  const { t } = useTranslation()
  return (
    <section aria-label={title} className="flex flex-col rounded-xl border bg-card">
      <div className="flex items-center gap-1 border-b px-3.5 py-2">
        <h2 className="flex-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
        {onUp && (
          <ShellBtn label={t('home.moveEarlier', { title })} onClick={onUp}>
            <ChevronUp className="size-3.5" />
          </ShellBtn>
        )}
        {onDown && (
          <ShellBtn label={t('home.moveLater', { title })} onClick={onDown}>
            <ChevronDown className="size-3.5" />
          </ShellBtn>
        )}
        <ShellBtn label={t('home.hideWidget', { title })} onClick={onHide}>
          <EyeOff className="size-3.5" />
        </ShellBtn>
      </div>
      <div className="flex-1 p-3.5">{children}</div>
    </section>
  )
}

function ShellBtn({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid size-6 place-items-center rounded text-muted-foreground/70 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
    >
      {children}
    </button>
  )
}

function SkeletonLines({ n }: { n: number }) {
  const { t } = useTranslation()
  return (
    <div className="space-y-2" role="status" aria-label={t('common.loading')}>
      {Array.from({ length: n }).map((_, i) => (
        <div
          key={i}
          className="h-3 rounded bg-muted motion-safe:animate-pulse"
          style={{ width: `${90 - i * 12}%`, animationDelay: `${i * 90}ms` }}
        />
      ))}
    </div>
  )
}

// ── mini time tracker: the same hooks as the Time Tracker page ───────────────

export function TrackerWidget() {
  const { t } = useTranslation()
  const { workItems, workItemById, entryViews, loading } = useTimeData()
  const { userName, running, start, stop } = useActiveTimer()
  const now = useNow(Boolean(running))
  const [selected, setSelected] = useState<string | null>(null)

  const mine = useMemo(
    () => entryViews.filter((r) => r.entry.userName === userName),
    [entryViews, userName],
  )

  const recentIds = useMemo(() => {
    const seen: string[] = []
    for (const { entry } of mine) {
      if (!seen.includes(entry.workItemId)) seen.push(entry.workItemId)
      if (seen.length >= 8) break
    }
    return seen
  }, [mine])

  const runningView = running ? workItemById.get(running.workItemId) : null

  if (loading) return <SkeletonLines n={3} />

  return runningView && running ? (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-emerald-500/40 p-3">
      <span className="relative flex size-2 shrink-0" aria-hidden>
        <span className="absolute inline-flex size-full rounded-full bg-emerald-400 opacity-75 motion-safe:animate-ping" />
        <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{runningView.item.name}</p>
        <p className="flex items-center gap-1.5 text-[11px]">
          <span
            aria-hidden
            className="size-1.5 rounded-full"
            style={{ background: runningView.color }}
          />
          <span style={{ color: runningView.color }}>{runningView.project?.name}</span>
          <span className="text-muted-foreground">· {runningView.company?.name}</span>
        </p>
      </div>
      <span className="font-mono text-xl tabular-nums text-emerald-400">
        {formatDuration(entrySeconds(running, now))}
      </span>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => {
          void stop()
          toast.success(t('time.entrySaved'))
        }}
      >
        <Square />
        {t('time.stop')}
      </Button>
    </div>
  ) : (
    <div className="flex gap-2">
      <div className="min-w-0 flex-1">
        <WorkItemSelector
          value={selected}
          onSelect={setSelected}
          workItems={workItems}
          recentIds={recentIds}
          createdBy={userName}
        />
      </div>
      <Button
        disabled={!selected}
        className="h-10"
        onClick={() => {
          if (selected) {
            void start(selected, '')
            setSelected(null)
          }
        }}
      >
        <Play />
        {t('time.start')}
      </Button>
    </div>
  )
}

// ── today/this week stats: trend + goal + daily breakdown ────────────────────

const GOAL_KEY = 'wl.home.dailyGoalSeconds'
const DEFAULT_GOAL_SECONDS = 4 * 3600

function useDailyGoal() {
  const [goalSeconds, setGoalSeconds] = useState(() => {
    const raw = Number(localStorage.getItem(GOAL_KEY))
    return raw > 0 ? raw : DEFAULT_GOAL_SECONDS
  })
  const setGoalHours = (hours: number) => {
    const seconds = Math.round(Math.min(16, Math.max(0.5, hours)) * 3600)
    setGoalSeconds(seconds)
    try {
      localStorage.setItem(GOAL_KEY, String(seconds))
    } catch {
      /* fine — goal just won't persist */
    }
  }
  return { goalSeconds, setGoalHours }
}

export function StatsWidget() {
  const { t } = useTranslation()
  const { entryViews, loading } = useTimeData()
  const { userName, running } = useActiveTimer()
  const now = useNow(Boolean(running))
  const { goalSeconds, setGoalHours } = useDailyGoal()
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalInput, setGoalInput] = useState('')

  const mine = useMemo(
    () => entryViews.filter((r) => r.entry.userName === userName),
    [entryViews, userName],
  )

  const todayKey = localDayKey(new Date())
  const yesterdayKey = localDayKey(new Date(Date.now() - 86_400_000))
  const weekStart = (() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    return d.getTime()
  })()

  const todayEntries = useMemo(
    () => mine.filter((r) => r.entry.date === todayKey).map((r) => r.entry),
    [mine, todayKey],
  )
  const todaySec = validSeconds(todayEntries, now)
  const yesterdaySec = validSeconds(
    mine.filter((r) => r.entry.date === yesterdayKey).map((r) => r.entry),
    now,
  )
  const weekSec = validSeconds(
    mine.filter((r) => new Date(r.entry.startTime).getTime() >= weekStart).map((r) => r.entry),
    now,
  )

  const trendPct =
    yesterdaySec > 0 ? Math.round(((todaySec - yesterdaySec) / yesterdaySec) * 100) : null
  const goalPct = Math.min(100, Math.round((todaySec / goalSeconds) * 100))

  const buckets = useMemo(() => {
    const b = { morning: 0, afternoon: 0, evening: 0 }
    for (const entry of todayEntries) {
      const hour = new Date(entry.startTime).getHours()
      const sec = entrySeconds(entry, now)
      if (hour < 12) b.morning += sec
      else if (hour < 17) b.afternoon += sec
      else b.evening += sec
    }
    return b
  }, [todayEntries, now])
  const bucketTotal = buckets.morning + buckets.afternoon + buckets.evening

  if (loading) return <SkeletonLines n={3} />

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {t('time.today')}
          </p>
          <p className="font-mono text-2xl font-semibold tabular-nums">
            {formatHoursMinutes(todaySec)}
          </p>
          {trendPct !== null && (
            <p
              className={cn(
                'flex items-center gap-1 text-[11px] font-medium',
                trendPct >= 0 ? 'text-emerald-500' : 'text-muted-foreground',
              )}
            >
              {trendPct >= 0 ? (
                <TrendingUp className="size-3" />
              ) : (
                <TrendingDown className="size-3" />
              )}
              {trendPct >= 0 ? '+' : ''}
              {trendPct}% {t('home.vsYesterday')}
            </p>
          )}
        </div>
        <div className="text-end">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {t('time.thisWeek')}
          </p>
          <p className="font-mono text-lg tabular-nums">{formatHoursMinutes(weekSec)}</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{t('home.dailyGoal')}</span>
          {editingGoal ? (
            <input
              autoFocus
              type="number"
              min={0.5}
              max={16}
              step={0.5}
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              onBlur={() => {
                const h = Number(goalInput)
                if (h > 0) setGoalHours(h)
                setEditingGoal(false)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur()
                if (e.key === 'Escape') setEditingGoal(false)
              }}
              className="w-14 rounded border bg-transparent px-1 py-0.5 text-end font-mono text-[11px] tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setGoalInput(String(goalSeconds / 3600))
                setEditingGoal(true)
              }}
              className="font-medium text-foreground/80 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              {t('home.goalHours', { hours: goalSeconds / 3600 })} · {goalPct}%
            </button>
          )}
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${goalPct}%` }}
          />
        </div>
      </div>

      {bucketTotal > 0 && (
        <div className="space-y-1.5 border-t pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t('home.dailyBreakdown')}
          </p>
          {(
            [
              ['morning', buckets.morning],
              ['afternoon', buckets.afternoon],
              ['evening', buckets.evening],
            ] as const
          ).map(([key, sec]) => (
            <div key={key} className="flex items-center gap-2 text-[11px]">
              <span className="w-16 shrink-0 text-muted-foreground">{t(`home.${key}`)}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary/60"
                  style={{ width: `${Math.round((sec / bucketTotal) * 100)}%` }}
                />
              </div>
              <span className="w-8 shrink-0 text-end font-mono tabular-nums text-muted-foreground">
                {formatShare(sec, bucketTotal)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── active tasks: recently worked-on items, one click to resume ──────────────

export function ActiveTasksWidget() {
  const { t } = useTranslation()
  const { workItemById, entryViews, loading } = useTimeData()
  const { userName, running, start, stop } = useActiveTimer()
  const now = useNow(Boolean(running))

  const mine = useMemo(
    () => entryViews.filter((r) => r.entry.userName === userName),
    [entryViews, userName],
  )
  const todayKey = localDayKey(new Date())

  const recentIds = useMemo(() => {
    const seen: string[] = []
    for (const { entry } of mine) {
      if (!seen.includes(entry.workItemId)) seen.push(entry.workItemId)
      if (seen.length >= 4) break
    }
    return seen
  }, [mine])

  if (loading) return <SkeletonLines n={3} />

  if (recentIds.length === 0) {
    return <p className="text-xs text-muted-foreground">{t('home.noRecentTasks')}</p>
  }

  return (
    <ul className="space-y-1.5">
      {recentIds.map((id) => {
        const w = workItemById.get(id)
        if (!w) return null
        const isRunning = Boolean(running) && running?.workItemId === id
        const todaySec = validSeconds(
          mine
            .filter((r) => r.entry.workItemId === id && r.entry.date === todayKey)
            .map((r) => r.entry),
          now,
        )
        const liveSec = isRunning && running ? entrySeconds(running, now) : todaySec
        return (
          <li key={id} className="flex items-center gap-2.5 rounded-lg border px-2.5 py-2">
            <span
              aria-hidden
              className={cn(
                'size-2 shrink-0 rounded-full',
                isRunning && 'motion-safe:animate-pulse',
              )}
              style={{ background: w.color }}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">{w.item.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {w.project?.name} · {w.company?.name}
              </p>
            </div>
            <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
              {formatDuration(liveSec)}
            </span>
            {isRunning ? (
              <Button
                size="sm"
                variant="destructive"
                className="h-7 shrink-0 px-2"
                onClick={() => void stop()}
              >
                <Square className="size-3" />
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-7 shrink-0 px-2 text-[11px]"
                disabled={Boolean(running)}
                title={running ? t('home.stopFirst') : undefined}
                onClick={() => void start(id, '')}
              >
                <Play className="size-3" />
                {t('home.taskResume')}
              </Button>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function localDayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── mini calendar ────────────────────────────────────────────────────────────

export function CalendarWidget() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { entryViews, palette, loading } = useTimeData()
  const { data: posts = [] } = usePostsQuery()
  const [monthOffset, setMonthOffset] = useState(0)

  const base = new Date()
  const view = new Date(base.getFullYear(), base.getMonth() + monthOffset, 1)
  const year = view.getFullYear()
  const month = view.getMonth()
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7 // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayKey = localDayKey(base)

  // locale-aware weekday initials, Monday first
  const weekdays = useMemo(() => {
    const anyMonday = new Date(2026, 5, 1) // a known Monday
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(anyMonday)
      d.setDate(d.getDate() + i)
      return d.toLocaleDateString(i18n.language, { weekday: 'narrow' })
    })
  }, [i18n.language])

  const dotByDay = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const { entry, work } of entryViews) {
      const co = work?.company?.id
      if (!co) continue
      const set = map.get(entry.date) ?? new Set<string>()
      set.add(co)
      map.set(entry.date, set)
    }
    return map
  }, [entryViews])

  const todaysPosts = posts.filter((p) => p.date === todayKey).slice(0, 3)

  if (loading) return <SkeletonLines n={4} />

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label={t('home.prevMonth')}
          onClick={() => setMonthOffset((m) => m - 1)}
          className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          <ChevronLeft className="size-4 rtl:rotate-180" />
        </button>
        <p className="text-[13px] font-medium">
          {view.toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' })}
        </p>
        <button
          type="button"
          aria-label={t('home.nextMonth')}
          onClick={() => setMonthOffset((m) => m + 1)}
          className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          <ChevronRight className="size-4 rtl:rotate-180" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center">
        {weekdays.map((d, i) => (
          <span key={i} className="text-[9px] font-semibold uppercase text-muted-foreground">
            {d}
          </span>
        ))}
        {Array.from({ length: firstDow }).map((_, i) => (
          <span key={`pad${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isToday = key === todayKey
          const dots = [...(dotByDay.get(key) ?? [])].slice(0, 3)
          return (
            <button
              key={key}
              type="button"
              onClick={() => navigate('/')}
              aria-label={`${key}${dots.length ? `, ${t('home.hasTrackedWork')}` : ''}${isToday ? `, ${t('time.today')}` : ''}`}
              className={cn(
                'flex aspect-square flex-col items-center justify-center rounded-md text-[11px] hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
                isToday ? 'bg-primary/15 font-bold text-primary' : 'text-foreground/80',
              )}
            >
              {day}
              <span className="mt-0.5 flex h-1 gap-0.5">
                {dots.map((co) => (
                  <span
                    key={co}
                    className="size-1 rounded-full"
                    style={{ background: palette.company(co) }}
                  />
                ))}
              </span>
            </button>
          )
        })}
      </div>

      <div className="border-t pt-2.5">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t('time.today')}
        </p>
        {todaysPosts.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {t('home.nothingScheduled')}{' '}
            <button
              type="button"
              onClick={() => navigate('/')}
              className="font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              {t('home.planAPost')}
            </button>
          </p>
        ) : (
          todaysPosts.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => navigate('/')}
              className="flex w-full items-center gap-2 rounded px-1 py-1 text-start text-xs hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                {p.time}
              </span>
              <span className="truncate text-foreground/80">{p.title}</span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

// ── quick actions: the two things people open Home to do next ────────────────

export function QuickActionsWidget() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { workItems } = useTimeData()
  const { userName } = useActiveTimer()
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => navigate('/')}
        className="flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-start text-[13px] font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        <CalendarPlus className="size-4 shrink-0 text-primary" />
        {t('home.planAPostAction')}
      </button>
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        className="flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-start text-[13px] font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        <Clock className="size-4 shrink-0 text-primary" />
        {t('home.logTime')}
      </button>

      <TimeEntryDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        entry={null}
        workItems={workItems}
        userName={userName}
      />
    </div>
  )
}

// ── prayer times: on by default, quiet, device-local ─────────────────────

const prayedKey = (date: string) => `wl.home.prayed.${date}`
const NOTIFY_KEY = 'wl.home.prayerNotify'
const NOTIFY_ASKED_KEY = 'wl.home.prayerNotifyAsked'

const PRAYER_ICON: Record<PrayerName, typeof Sun> = {
  Fajr: Moon,
  Sunrise: Sunrise,
  Dhuhr: Sun,
  Asr: CloudSun,
  Maghrib: Sunset,
  Isha: MoonStar,
}

/** A gentle two-note chime via WebAudio — no audio asset, nothing jarring. */
function chime() {
  try {
    const ctx = new AudioContext()
    const note = (freq: number, at: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      osc.connect(gain)
      gain.connect(ctx.destination)
      gain.gain.setValueAtTime(0, ctx.currentTime + at)
      gain.gain.linearRampToValueAtTime(0.16, ctx.currentTime + at + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + 0.9)
      osc.start(ctx.currentTime + at)
      osc.stop(ctx.currentTime + at + 1)
    }
    void ctx.resume()
    note(587.33, 0) // D5
    note(880, 0.35) // A5
    window.setTimeout(() => void ctx.close(), 1600)
  } catch {
    /* audio blocked — the toast and notification still land */
  }
}

/** The day as an arc: each prayer is a marker at its time-of-day position,
 *  the filled stroke is how far the day has come, the dot is "now". Calm by
 *  design — no progress-toward-100%, just where the day stands. */
function DayArc({
  sequence,
  nowMs,
  nextIdx,
}: {
  sequence: { name: PrayerName; at: Date }[]
  nowMs: number
  nextIdx: number
}) {
  const CX = 100
  const CY = 96
  const R = 86
  const angleOf = (mins: number) => Math.PI * (1 - mins / 1440)
  const pt = (mins: number) => {
    const a = angleOf(mins)
    return { x: CX + R * Math.cos(a), y: CY - R * Math.sin(a) }
  }
  const minsOf = (d: Date) => d.getHours() * 60 + d.getMinutes()
  const nowMins = minsOf(new Date(nowMs))
  const nowPt = pt(nowMins)
  const sunUp = nowMins >= minsOf(sequence[1].at) && nowMins < minsOf(sequence[4].at)

  const arcPath = (fromMins: number, toMins: number) => {
    const a = pt(fromMins)
    const b = pt(toMins)
    return `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} A ${R} ${R} 0 0 1 ${b.x.toFixed(1)} ${b.y.toFixed(1)}`
  }

  return (
    <svg viewBox="0 0 200 104" className="w-full" aria-hidden>
      <path d={arcPath(0, 1439)} fill="none" className="stroke-border" strokeWidth="2" />
      <path
        d={arcPath(0, Math.max(1, nowMins))}
        fill="none"
        className="stroke-primary/50"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {sequence.map(({ name, at }, i) => {
        const p2 = pt(minsOf(at))
        const past = minsOf(at) <= nowMins
        return (
          <circle
            key={name}
            cx={p2.x}
            cy={p2.y}
            r={i === nextIdx ? 4 : 3}
            className={
              i === nextIdx
                ? 'fill-primary'
                : past
                  ? 'fill-muted-foreground/40'
                  : 'fill-muted-foreground/70'
            }
          />
        )
      })}
      <circle
        cx={nowPt.x}
        cy={nowPt.y}
        r="6"
        className={sunUp ? 'fill-amber-400/25' : 'fill-slate-400/20'}
      />
      <circle
        cx={nowPt.x}
        cy={nowPt.y}
        r="3"
        className={sunUp ? 'fill-amber-400' : 'fill-slate-300'}
      />
    </svg>
  )
}

// Shared across the header bell and the widget's own toggle so either one
// flips both in sync — same tab, same render tree, a tiny pub-sub is enough.
const notifyListeners = new Set<(v: boolean) => void>()
const getNotifyPref = () => localStorage.getItem(NOTIFY_KEY) !== 'off'
const setNotifyPref = (v: boolean) => {
  localStorage.setItem(NOTIFY_KEY, v ? 'on' : 'off')
  notifyListeners.forEach((fn) => fn(v))
}

function usePrayerNotifyToggle() {
  const { t } = useTranslation()
  const [notify, setNotify] = useState(getNotifyPref)
  useEffect(() => {
    notifyListeners.add(setNotify)
    return () => {
      notifyListeners.delete(setNotify)
    }
  }, [])
  const toggle = async () => {
    const next = !notify
    setNotifyPref(next)
    if (next) {
      if ('Notification' in window && Notification.permission === 'default') {
        // Asked from a click, with the reason right beside the control.
        await Notification.requestPermission()
      }
      chime() // preview — this click is the user gesture audio needs
      toast(t('home.notifyEnabled'))
    }
  }
  return { notify, toggle }
}

/** The bell in Home's own page header — mirrors the same on/off switch as the
 *  prayer widget's inline toggle, for people who hid that widget. */
export function PrayerNotifyBell() {
  const { t } = useTranslation()
  const { notify, toggle } = usePrayerNotifyToggle()
  return (
    <button
      type="button"
      onClick={() => void toggle()}
      aria-pressed={notify}
      aria-label={notify ? t('home.notifyOff') : t('home.notifyOn')}
      title={notify ? t('home.notifyOff') : t('home.notifyOn')}
      className={cn(
        'grid size-9 shrink-0 place-items-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
        notify
          ? 'border-primary/40 bg-primary/5 text-primary'
          : 'border-input text-muted-foreground hover:bg-accent',
      )}
    >
      {notify ? <Bell className="size-4" /> : <BellOff className="size-4" />}
    </button>
  )
}

export function PrayerWidget() {
  const { t, i18n } = useTranslation()
  const [month] = useState<PrayerDay[]>(() => mockPrayerMonth())
  const [tick, setTick] = useState(() => Date.now())
  const lastTick = useRef(Date.now())
  const { notify, toggle: toggleNotify } = usePrayerNotifyToggle()
  const [prayed, setPrayed] = useState<Set<string>>(() => {
    try {
      return new Set(
        JSON.parse(localStorage.getItem(prayedKey(localDayKey(new Date()))) ?? '[]') as string[],
      )
    } catch {
      return new Set()
    }
  })

  // First visit: ask for notification permission right away — reminders are
  // on by default, so the ask shouldn't hide behind the bell. Asked once per
  // device; a dismissed prompt isn't re-nagged on every load (the bell can
  // always re-trigger it).
  useEffect(() => {
    if (!notify || !('Notification' in window)) return
    if (Notification.permission !== 'default') return
    if (localStorage.getItem(NOTIFY_ASKED_KEY)) return
    localStorage.setItem(NOTIFY_ASKED_KEY, '1')
    void Notification.requestPermission()
  }, [notify])

  // Twice a minute: recompute the countdown AND detect a prayer time crossing
  // since the last tick — that is what fires the alert exactly once.
  useEffect(() => {
    const id = window.setInterval(() => setTick(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  const now = new Date(tick)
  const todayKey = localDayKey(now)
  const today = useMemo(() => month.find((d) => d.date === todayKey) ?? month[0], [month, todayKey])

  const sequence = useMemo(() => {
    const toDate = (hm: string) => {
      const [h, m] = hm.split(':').map(Number)
      const d = new Date(tick)
      d.setHours(h, m, 0, 0)
      return d
    }
    return PRAYERS.map((name) => ({ name, at: toDate(today[name]) }))
  }, [today, tick])

  const prayerLabel = useCallback((name: PrayerName) => t(`home.prayer.${name.toLowerCase()}`), [t])

  // Fire when a prayer time passed between two ticks: chime + toast + (if
  // permitted) a system notification.
  useEffect(() => {
    const prev = lastTick.current
    lastTick.current = tick
    if (!notify) return
    for (const { name, at } of sequence) {
      if (name === 'Sunrise') continue
      const ms = at.getTime()
      if (ms > prev && ms <= tick) {
        chime()
        toast(t('home.itsTimeFor', { prayer: prayerLabel(name) }), {
          description: at.toLocaleTimeString(i18n.language, { hour: 'numeric', minute: '2-digit' }),
        })
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(prayerLabel(name), {
            body: t('home.itsTimeFor', { prayer: prayerLabel(name) }),
          })
        }
      }
    }
  }, [tick, notify, sequence, t, i18n.language, prayerLabel])

  if (!today) return <SkeletonLines n={4} />

  const nextIdx = sequence.findIndex((p2) => p2.at.getTime() > tick)
  const currentIdx = nextIdx === -1 ? sequence.length - 1 : Math.max(0, nextIdx - 1)
  const next =
    nextIdx === -1
      ? {
          name: 'Fajr' as PrayerName,
          at: (() => {
            const [h, m] = today.Fajr.split(':').map(Number)
            const d = new Date(tick)
            d.setDate(d.getDate() + 1)
            d.setHours(h, m, 0, 0)
            return d
          })(),
        }
      : sequence[nextIdx]
  const untilMs = next.at.getTime() - tick
  const untilH = Math.floor(untilMs / 3600000)
  const untilM = Math.max(0, Math.floor((untilMs % 3600000) / 60000))

  const togglePrayed = (name: PrayerName) => {
    const nextSet = new Set(prayed)
    if (nextSet.has(name)) nextSet.delete(name)
    else nextSet.add(name)
    setPrayed(nextSet)
    try {
      localStorage.setItem(prayedKey(todayKey), JSON.stringify([...nextSet]))
    } catch {
      /* fine */
    }
  }

  return (
    <div className="space-y-3">
      <DayArc sequence={sequence} nowMs={tick} nextIdx={nextIdx === -1 ? 0 : nextIdx} />

      <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
        <p className="min-w-0 flex-1 text-[13px]">
          <span className="font-semibold">{prayerLabel(sequence[currentIdx].name)}</span>
          <span className="text-muted-foreground"> {t('home.prayerNow')} · </span>
          <span className="font-semibold text-primary">{prayerLabel(next.name)}</span>
          <span className="text-muted-foreground"> {t('home.prayerIn')} </span>
          <span className="font-mono tabular-nums">
            {untilH > 0 ? `${untilH}h ${untilM}m` : `${untilM}m`}
          </span>
        </p>
        <button
          type="button"
          onClick={() => void toggleNotify()}
          aria-pressed={notify}
          aria-label={notify ? t('home.notifyOff') : t('home.notifyOn')}
          title={notify ? t('home.notifyOff') : t('home.notifyOn')}
          className={cn(
            'grid size-8 shrink-0 place-items-center rounded-lg border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
            notify ? 'border-primary/40 text-primary' : 'border-input text-muted-foreground',
          )}
        >
          {notify ? <Bell className="size-4" /> : <BellOff className="size-4" />}
        </button>
      </div>

      <ul>
        {sequence.map(({ name, at }, i) => {
          const past = i < currentIdx || (nextIdx === -1 && i <= currentIdx)
          const isCurrent = i === currentIdx && nextIdx !== -1
          const isNext = i === nextIdx
          const isSunrise = name === 'Sunrise'
          const Icon = PRAYER_ICON[name]
          return (
            <li
              key={name}
              className={cn(
                'flex items-center gap-2 rounded px-1.5 py-1',
                isCurrent && 'bg-primary/10',
              )}
            >
              <Icon
                className={cn(
                  'size-3.5 shrink-0',
                  isNext
                    ? 'text-primary'
                    : past && !isCurrent
                      ? 'text-muted-foreground/50'
                      : 'text-muted-foreground',
                )}
              />
              <span
                className={cn(
                  'flex-1 text-[13px]',
                  past && !isCurrent
                    ? 'text-muted-foreground/60'
                    : isNext
                      ? 'font-semibold text-primary'
                      : isCurrent
                        ? 'font-semibold'
                        : '',
                )}
              >
                {prayerLabel(name)}
              </span>
              <span
                className={cn(
                  'font-mono text-[13px] tabular-nums',
                  past && !isCurrent ? 'text-muted-foreground/60' : 'text-muted-foreground',
                )}
              >
                {at.toLocaleTimeString(i18n.language, { hour: 'numeric', minute: '2-digit' })}
              </span>
              {!isSunrise && (
                <button
                  type="button"
                  onClick={() => togglePrayed(name)}
                  aria-pressed={prayed.has(name)}
                  aria-label={t('home.markPrayed', { prayer: prayerLabel(name) })}
                  className={cn(
                    'grid size-5 place-items-center rounded-full border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
                    prayed.has(name)
                      ? 'border-emerald-500 text-emerald-400'
                      : 'border-input text-muted-foreground/50',
                  )}
                >
                  {prayed.has(name) && <Check className="size-3" />}
                </button>
              )}
            </li>
          )
        })}
      </ul>

      <p className="flex flex-wrap items-center gap-x-2 border-t pt-2 text-[11px] text-muted-foreground/70">
        <MapPin className="size-3" /> {t('home.prayerSource')}
        <button
          type="button"
          onClick={() => toast.info(t('home.prayerSettingsHint'))}
          className="text-muted-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          {t('home.change')}
        </button>
        <span className="ms-auto">{t('home.cachedThisMonth')}</span>
      </p>
    </div>
  )
}

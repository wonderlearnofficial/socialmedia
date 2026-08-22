import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { entrySeconds, formatHoursMinutes } from '@/lib/time'
import { cn } from '@/lib/utils'
import type { Palette } from './colors'
import { entryProblem, formatShare, validSeconds } from './integrity'
import type { TimeEntryView } from './useTimeData'

export interface BreakdownFocus {
  type: 'workItem' | 'project' | 'company'
  id: string
  label: string
}

interface Slice {
  id: string
  label: string
  sub?: string
  color: string
  seconds: number
}

interface TimeBreakdownProps {
  rows: TimeEntryView[]
  palette: Palette
  focus: BreakdownFocus | null
  onFocus: (focus: BreakdownFocus | null) => void
}

/**
 * The three questions this page should answer at a glance — how much per day,
 * per project, per company — shown side by side instead of hidden behind a
 * "group by" dropdown. The table below stays grouped by date, which is the
 * only ordering that reads chronologically.
 *
 * Every row here is also a filter: clicking a project or company narrows the
 * whole view to it, so the summary doubles as navigation.
 */
export function TimeBreakdown({ rows, palette, focus, onFocus }: TimeBreakdownProps) {
  const { t } = useTranslation()
  const now = Date.now()

  const total = validSeconds(
    rows.map((r) => r.entry),
    now,
  )

  const byWorkItem = useMemo<Slice[]>(() => {
    const map = new Map<string, Slice>()
    for (const { entry, work } of rows) {
      const id = work?.item.id
      if (!id || entryProblem(entry)) continue
      const seconds = entrySeconds(entry, now)
      const existing = map.get(id)
      if (existing) existing.seconds += seconds
      else
        map.set(id, {
          id,
          label: work.item.name,
          sub: work.project?.name,
          // A work item wears its project's colour — items have no colour of
          // their own, so the family stays readable at every level.
          color: work.color ?? palette.project(work.project?.id),
          seconds,
        })
    }
    return [...map.values()].sort((a, b) => b.seconds - a.seconds)
  }, [rows, now, palette])

  const byProject = useMemo<Slice[]>(() => {
    const map = new Map<string, Slice>()
    for (const { entry, work } of rows) {
      const id = work?.project?.id
      if (!id || entryProblem(entry)) continue
      const seconds = entrySeconds(entry, now)
      const existing = map.get(id)
      if (existing) existing.seconds += seconds
      else
        map.set(id, {
          id,
          label: work?.project?.name ?? '—',
          sub: work?.company?.name,
          color: palette.project(id),
          seconds,
        })
    }
    return [...map.values()].sort((a, b) => b.seconds - a.seconds)
  }, [rows, now, palette])

  const byCompany = useMemo<Slice[]>(() => {
    const map = new Map<string, Slice>()
    for (const { entry, work } of rows) {
      const id = work?.company?.id
      if (!id || entryProblem(entry)) continue
      const seconds = entrySeconds(entry, now)
      const existing = map.get(id)
      if (existing) existing.seconds += seconds
      else
        map.set(id, {
          id,
          label: work?.company?.name ?? '—',
          color: palette.company(id),
          seconds,
        })
    }
    return [...map.values()].sort((a, b) => b.seconds - a.seconds)
  }, [rows, now, palette])

  if (total === 0) return null

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <Panel title={t('time.byWorkItem')}>
        <SliceList
          slices={byWorkItem}
          total={total}
          type="workItem"
          focus={focus}
          onFocus={onFocus}
        />
      </Panel>

      <Panel title={t('time.byProject')}>
        <SliceList
          slices={byProject}
          total={total}
          type="project"
          focus={focus}
          onFocus={onFocus}
        />
      </Panel>

      <Panel title={t('time.byCompany')}>
        <SliceList
          slices={byCompany}
          total={total}
          type="company"
          focus={focus}
          onFocus={onFocus}
        />
      </Panel>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-card p-3">
      <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  )
}

function SliceList({
  slices,
  total,
  type,
  focus,
  onFocus,
}: {
  slices: Slice[]
  total: number
  type: 'workItem' | 'project' | 'company'
  focus: BreakdownFocus | null
  onFocus: (focus: BreakdownFocus | null) => void
}) {
  const { t } = useTranslation()

  if (slices.length === 0) {
    return <p className="py-4 text-center text-xs text-muted-foreground">{t('time.noData')}</p>
  }

  return (
    <ul className="space-y-1.5">
      {/* Only the top few — this is a summary, and the table below is the
          complete record. */}
      {slices.slice(0, 5).map((slice) => {
        const share = formatShare(slice.seconds, total)
        const active = focus?.type === type && focus.id === slice.id
        return (
          <li key={slice.id}>
            <button
              type="button"
              onClick={() => onFocus(active ? null : { type, id: slice.id, label: slice.label })}
              aria-pressed={active}
              className={cn(
                'w-full rounded-md px-1.5 py-1 text-start transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
                active && 'bg-accent',
              )}
            >
              <span className="flex items-baseline gap-2">
                <span
                  aria-hidden
                  className="size-2 shrink-0 translate-y-px rounded-full"
                  style={{ background: slice.color }}
                />
                <span className="min-w-0 flex-1 truncate text-xs font-medium">{slice.label}</span>
                {slice.sub && (
                  <span className="hidden shrink-0 text-[11px] text-muted-foreground xl:inline">
                    {slice.sub}
                  </span>
                )}
                <span className="shrink-0 font-mono text-xs tabular-nums">
                  {formatHoursMinutes(slice.seconds)}
                </span>
                <span className="w-10 shrink-0 text-end text-[11px] text-muted-foreground">
                  {share}
                </span>
              </span>
              <span className="mt-1 block h-1 w-full overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${Math.max(2, (slice.seconds / total) * 100)}%`,
                    background: slice.color,
                  }}
                />
              </span>
            </button>
          </li>
        )
      })}
      {slices.length > 5 && (
        <li className="px-1.5 pt-0.5 text-[11px] text-muted-foreground">
          {t('time.andMore', { count: slices.length - 5 })}
        </li>
      )}
    </ul>
  )
}

/** The removable chip shown when a breakdown row is being used as a filter. */
export function FocusChip({ focus, onClear }: { focus: BreakdownFocus; onClear: () => void }) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={onClear}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-2.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      aria-label={t('time.clearFilter')}
    >
      {focus.label}
      <X className="size-3" />
    </button>
  )
}

import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  AlertTriangle,
  Copy,
  Download,
  MoreVertical,
  Pencil,
  Play,
  Search,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { useDeleteTimeEntry } from '@/hooks/useTimeTracker'
import { formatDateShort } from '@/lib/dates'
import { entrySeconds, formatDuration, formatHoursMinutes, toTimeInput } from '@/lib/time'
import { cn } from '@/lib/utils'
import type { TimeEntry } from '@/types'
import type { Palette } from './colors'
import { FocusChip, TimeBreakdown, type BreakdownFocus } from './TimeBreakdown'
import { EntryStatusBadge } from './EntryStatusBadge'
import { DAY_SECONDS, entryProblem, formatShare, overlappingIds, validSeconds } from './integrity'
import { presetRange, type DatePreset } from './reports'
import type { TimeEntryView } from './useTimeData'

interface DayGroup {
  key: string
  label: string
  rows: TimeEntryView[]
  seconds: number
}

interface TimeHistoryProps {
  rows: TimeEntryView[]
  palette: Palette
  /** Only this person's rows get an actions menu. */
  currentUser: string
  onEdit: (entry: TimeEntry) => void
  onDuplicate: (entry: TimeEntry) => void
  onResume: (entry: TimeEntry) => void
  loading?: boolean
}

const RANGES: DatePreset[] = ['today', 'this_week', 'this_month', 'all']

function dayHeading(dateKey: string, t: (k: string) => string) {
  const today = new Date()
  const yesterday = new Date(Date.now() - 864e5)
  const key = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  if (dateKey === key(today)) return t('time.today')
  if (dateKey === key(yesterday)) return t('time.yesterday')
  return formatDateShort(dateKey)
}

/**
 * The one history view. "Today" is the first date group rather than a separate
 * table above — the old page listed the same entries twice, which made every
 * total unverifiable.
 */
export function TimeHistory({
  rows,
  palette,
  currentUser,
  onEdit,
  onDuplicate,
  onResume,
  loading,
}: TimeHistoryProps) {
  const { t } = useTranslation()
  const [preset, setPreset] = useState<DatePreset>('this_week')
  const [focus, setFocus] = useState<BreakdownFocus | null>(null)
  const [query, setQuery] = useState('')
  const [pendingDelete, setPendingDelete] = useState<TimeEntry | null>(null)
  const remove = useDeleteTimeEntry()

  const now = Date.now()

  const visible = useMemo(() => {
    const range = presetRange(preset)
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
    return rows
      .filter(({ entry }) => {
        if (range.from && entry.date < range.from) return false
        if (range.to && entry.date > range.to) return false
        return true
      })
      .filter(({ work }) => {
        // A breakdown row doubles as a filter for the whole view.
        if (!focus) return true
        if (focus.type === 'workItem') return work?.item.id === focus.id
        if (focus.type === 'project') return work?.project?.id === focus.id
        return work?.company?.id === focus.id
      })
      .filter(({ entry, work }) => {
        if (terms.length === 0) return true
        const haystack =
          `${work?.item.name ?? ''} ${work?.project?.name ?? ''} ${work?.company?.name ?? ''} ${entry.description} ${entry.userName}`.toLowerCase()
        return terms.every((term) => haystack.includes(term))
      })
      .sort((a, b) => (a.entry.startTime < b.entry.startTime ? 1 : -1))
  }, [rows, preset, query, focus])

  // Totals count only entries that can be believed — see integrity.ts.
  const total = validSeconds(
    visible.map((r) => r.entry),
    now,
  )
  const invalidCount = visible.filter((r) => entryProblem(r.entry)).length
  const overlaps = useMemo(() => overlappingIds(visible.map((r) => r.entry)), [visible])

  // A single day can't hold more than 24 hours; if one does, something is
  // double-counted and the total shouldn't be presented as fact.
  const overLongDay = useMemo(() => {
    const perDay = new Map<string, number>()
    for (const { entry } of visible) {
      if (entryProblem(entry)) continue
      perDay.set(entry.date, (perDay.get(entry.date) ?? 0) + entrySeconds(entry, now))
    }
    return [...perDay.values()].some((v) => v > DAY_SECONDS)
  }, [visible, now])

  const groups = useMemo<DayGroup[]>(() => {
    const map = new Map<string, DayGroup>()
    for (const row of visible) {
      const { entry } = row
      const existing = map.get(entry.date)
      if (existing) {
        existing.rows.push(row)
        if (!entryProblem(entry)) existing.seconds += entrySeconds(entry, now)
      } else {
        map.set(entry.date, {
          key: entry.date,
          label: dayHeading(entry.date, t),
          rows: [row],
          seconds: entrySeconds(entry, now),
        })
      }
    }
    return [...map.values()].sort((a, b) => (a.key < b.key ? 1 : -1))
  }, [visible, now, t])

  const confirmDelete = async () => {
    if (!pendingDelete) return
    try {
      await remove.mutateAsync(pendingDelete.id)
      toast.success(t('time.entryDeleted'))
    } catch {
      toast.error(t('common.errorTitle'))
    } finally {
      setPendingDelete(null)
    }
  }

  const exportCsv = () => {
    const header = [
      t('time.date'),
      t('time.user'),
      t('time.workItem'),
      t('time.project'),
      t('time.company'),
      t('time.description'),
      t('time.start'),
      t('time.end'),
      t('time.duration'),
    ]
    const body = visible.map(({ entry, work }) => [
      entry.date,
      entry.userName,
      work?.item.name ?? '',
      work?.project?.name ?? '',
      work?.company?.name ?? '',
      entry.description,
      toTimeInput(entry.startTime),
      entry.endTime ? toTimeInput(entry.endTime) : '',
      formatHoursMinutes(entrySeconds(entry, now)),
    ])
    const csv = [header, ...body]
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    // Leading BOM so Excel reads it as UTF-8 rather than mangling accents.
    const bom = String.fromCharCode(0xfeff)
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `time-entries-${preset}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const canEdit = (entry: TimeEntry) => entry.userName === currentUser

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div
          className="flex rounded-lg border p-0.5"
          role="tablist"
          aria-label={t('time.dateRange')}
        >
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              role="tab"
              aria-selected={preset === r}
              onClick={() => setPreset(r)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
                preset === r ? 'bg-accent text-accent-foreground' : 'text-muted-foreground',
              )}
            >
              {t(`time.preset.${r}`)}
            </button>
          ))}
        </div>

        {focus && <FocusChip focus={focus} onClear={() => setFocus(null)} />}

        <div className="relative ms-auto">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('time.searchEntries')}
            aria-label={t('time.searchEntries')}
            className="h-8 w-44 ps-8 text-xs"
          />
        </div>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={exportCsv}
          aria-label={t('time.exportCsv')}
          title={t('time.exportCsv')}
        >
          <Download />
        </Button>
      </div>

      {/* Scope line — says what the numbers below actually cover */}
      <div className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 text-xs">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground">
          {/* The summary always names the range it describes — it used to say
              "4 entries" with no clue which filter produced them. */}
          <span>
            {t(`time.preset.${preset}`)} · {t('time.summaryEntries', { count: visible.length })}
          </span>
          {query && <span>· “{query}”</span>}
          {invalidCount > 0 && (
            <span className="inline-flex items-center gap-1 text-destructive">
              <AlertTriangle className="size-3" />
              {t('time.excludedInvalid', { count: invalidCount })}
            </span>
          )}
          {overLongDay && (
            <span className="inline-flex items-center gap-1 text-amber-400">
              <AlertTriangle className="size-3" />
              {t('time.dayOver24h')}
            </span>
          )}
        </span>
        <span className="font-mono text-sm tabular-nums">{formatHoursMinutes(total)}</span>
      </div>

      {/* Where the time went — always visible, never behind a dropdown. */}
      <TimeBreakdown rows={visible} palette={palette} focus={focus} onFocus={setFocus} />

      {loading ? (
        <div className="rounded-lg border bg-card">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 border-b p-3 last:border-0">
              <div className="h-3 flex-1 animate-pulse rounded bg-muted" />
              <div className="h-3 w-16 animate-pulse rounded bg-muted" />
            </div>
          ))}
          <span className="sr-only">{t('common.loading')}</span>
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-lg border bg-card px-6 py-12 text-center">
          <p className="text-sm font-medium">
            {query ? t('time.noSearchResults') : t('time.noEntriesInRange')}
          </p>
          <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
            {query ? t('time.noSearchResultsBody') : t('time.emptyBody')}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">{t('time.tableCaption')}</caption>
              <thead className="hidden sm:table-header-group">
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="px-3 py-2 text-start font-medium">{t('time.workItem')}</th>
                  <th className="px-3 py-2 text-start font-medium">{t('time.description')}</th>
                  <th className="px-3 py-2 text-end font-medium">{t('time.start')}</th>
                  <th className="px-3 py-2 text-end font-medium">{t('time.end')}</th>
                  <th className="px-3 py-2 text-end font-medium">{t('time.duration')}</th>
                  <th className="w-16" />
                </tr>
              </thead>

              {groups.map((group) => (
                <tbody key={group.key}>
                  <tr className="bg-muted/40">
                    <th
                      scope="colgroup"
                      colSpan={9}
                      className="px-3 py-1.5 text-start text-[11px] font-semibold uppercase tracking-wider"
                    >
                      <span className="flex items-center gap-2">
                        <span>{group.label}</span>
                        <span className="ms-auto flex items-center gap-2 font-normal normal-case tracking-normal">
                          {total > 0 && (
                            <span className="text-muted-foreground">
                              {formatShare(group.seconds, total)}
                            </span>
                          )}
                          <span className="font-mono font-semibold">
                            {formatHoursMinutes(group.seconds)}
                          </span>
                        </span>
                      </span>
                    </th>
                  </tr>

                  {group.rows.map(({ entry, work }) => {
                    const seconds = entrySeconds(entry, now)
                    const problem = entryProblem(entry)
                    const overlapping = overlaps.has(entry.id)
                    const isRunning = entry.status === 'running'
                    const short = !isRunning && seconds < 60
                    const dot = work?.color ?? palette.project(work?.project?.id)
                    return (
                      <tr
                        key={entry.id}
                        className={cn(
                          'border-b last:border-0 hover:bg-accent/40',
                          short && 'opacity-55',
                          problem && 'bg-destructive/5',
                        )}
                      >
                        <td className="px-3 py-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="truncate font-medium">
                                {work?.item.name ?? t('time.unknownWorkItem')}
                              </span>
                              {/* A broken row says so in red — the old UI marked
                                  it a neutral "Edited" and let it poison the
                                  totals silently. */}
                              {problem ? (
                                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-destructive/50 px-2 py-0.5 text-[11px] font-semibold text-destructive">
                                  <AlertTriangle className="size-3" />
                                  {t(
                                    problem === 'ends_before_start'
                                      ? 'time.invalidEndsBeforeStart'
                                      : 'time.invalidTooLong',
                                  )}
                                </span>
                              ) : (
                                <EntryStatusBadge status={entry.status} />
                              )}
                              {overlapping && !problem && (
                                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-500/50 px-2 py-0.5 text-[11px] font-medium text-amber-400">
                                  <AlertTriangle className="size-3" />
                                  {t('time.overlaps')}
                                </span>
                              )}
                            </div>
                            {/* The project reads in its own colour — that's
                                what makes a long list scannable without
                                reading every line. */}
                            <div className="flex min-w-0 items-center gap-1.5 text-xs">
                              <span
                                aria-hidden
                                className="size-2 shrink-0 rounded-full"
                                style={{ background: dot }}
                              />
                              <span className="truncate font-medium" style={{ color: dot }}>
                                {work?.project?.name ?? '—'}
                              </span>
                              {work?.company?.name && (
                                <span className="truncate text-muted-foreground">
                                  · {work.company.name}
                                </span>
                              )}
                            </div>
                            {/* Mobile: times and duration fold in here */}
                            <div className="mt-0.5 text-xs text-muted-foreground sm:hidden">
                              {toTimeInput(entry.startTime)}
                              {entry.endTime ? `–${toTimeInput(entry.endTime)}` : ''}
                              {' · '}
                              <span className={cn('font-mono', isRunning && 'text-emerald-400')}>
                                {isRunning ? formatDuration(seconds) : formatHoursMinutes(seconds)}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="hidden max-w-[220px] truncate px-3 py-2 text-muted-foreground sm:table-cell">
                          {entry.description || '—'}
                        </td>
                        <td className="hidden whitespace-nowrap px-3 py-2 text-end tabular-nums text-muted-foreground sm:table-cell">
                          {toTimeInput(entry.startTime)}
                        </td>
                        <td className="hidden whitespace-nowrap px-3 py-2 text-end tabular-nums text-muted-foreground sm:table-cell">
                          {entry.endTime ? toTimeInput(entry.endTime) : '—'}
                        </td>
                        <td
                          className={cn(
                            'hidden whitespace-nowrap px-3 py-2 text-end font-mono tabular-nums sm:table-cell',
                            isRunning && 'text-emerald-400',
                          )}
                        >
                          {problem
                            ? '—'
                            : isRunning
                              ? formatDuration(seconds)
                              : formatHoursMinutes(seconds)}
                        </td>

                        <td className="px-2 py-2 text-end">
                          {canEdit(entry) && !isRunning && (
                            <div className="flex items-center justify-end gap-0.5">
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                onClick={() => onResume(entry)}
                                aria-label={t('time.resume')}
                                title={t('time.resume')}
                              >
                                <Play />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    size="icon-sm"
                                    variant="ghost"
                                    aria-label={t('time.entryActions')}
                                  >
                                    <MoreVertical />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onSelect={() => onEdit(entry)}>
                                    <Pencil />
                                    {t('time.edit')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onSelect={() => onDuplicate(entry)}>
                                    <Copy />
                                    {t('time.duplicate')}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onSelect={() => setPendingDelete(entry)}
                                    className="text-destructive focus:text-destructive [&_svg]:text-destructive"
                                  >
                                    <Trash2 />
                                    {t('time.delete')}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              ))}
            </table>
          </div>
        </div>
      )}

      <Dialog
        open={Boolean(pendingDelete)}
        onOpenChange={(next) => !next && setPendingDelete(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('time.deleteConfirmTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t('time.deleteConfirmBody')}</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingDelete(null)}>
              {t('editor.cancel')}
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={remove.isPending}>
              {t('time.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

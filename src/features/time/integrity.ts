import type { TimeEntry } from '@/types'

/**
 * Whether an entry can be believed.
 *
 * One corrupt row was producing a 24h 11m day total and a "Newton 100%" share:
 * its end time was before its start, and the old duration maths read that as
 * crossing midnight, turning a twelve-minute typo into 23h 48m. Aggregates that
 * silently include a row like that are worse than no aggregates.
 */

/** A single sitting longer than this is a mistake, not work. */
export const MAX_ENTRY_SECONDS = 12 * 3600
/** No day can hold more than this. */
export const DAY_SECONDS = 24 * 3600

export type EntryProblem = 'ends_before_start' | 'too_long'

export function entryProblem(entry: TimeEntry): EntryProblem | null {
  if (entry.status === 'running') return null
  if (!entry.endTime) return null
  const start = new Date(entry.startTime).getTime()
  const end = new Date(entry.endTime).getTime()
  if (end <= start) return 'ends_before_start'
  if (entry.duration > MAX_ENTRY_SECONDS) return 'too_long'
  return null
}

export const isValidEntry = (entry: TimeEntry) => entryProblem(entry) === null

/**
 * Totals exclude invalid entries rather than including them with a caveat.
 * A number nobody can trust is worse than a number that's missing something and
 * says so — and the row itself stays visible and flagged, so nothing is hidden.
 */
export function validSeconds(entries: TimeEntry[], now: number = Date.now()) {
  return entries.filter(isValidEntry).reduce((sum, entry) => {
    if (entry.status === 'running') {
      return sum + Math.max(0, Math.floor((now - new Date(entry.startTime).getTime()) / 1000))
    }
    return sum + entry.duration
  }, 0)
}

/** Entries that overlap in time — usually a forgotten running timer. */
export function overlappingIds(entries: TimeEntry[]): Set<string> {
  const overlapping = new Set<string>()
  const sorted = entries
    .filter(isValidEntry)
    .filter((e) => e.endTime)
    .sort((a, b) => (a.startTime < b.startTime ? -1 : 1))

  for (let i = 1; i < sorted.length; i += 1) {
    const previous = sorted[i - 1]
    const current = sorted[i]
    if (new Date(current.startTime) < new Date(previous.endTime as string)) {
      overlapping.add(previous.id)
      overlapping.add(current.id)
    }
  }
  return overlapping
}

/**
 * A share of a total, never rounded down to a misleading "0%".
 * A real three minutes shows as "<1%", not as nothing.
 */
export function formatShare(seconds: number, total: number) {
  if (total <= 0 || seconds <= 0) return '0%'
  const pct = (seconds / total) * 100
  if (pct < 1) return '<1%'
  if (pct < 10) return `${pct.toFixed(1)}%`
  return `${Math.round(pct)}%`
}

import type { TimeEntry } from '@/types'

const HOUR = 3600
const MINUTE = 60

/** "01:24:32" — the running-timer format. Hours are not capped at 24. */
export function formatDuration(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds))
  const h = Math.floor(safe / HOUR)
  const m = Math.floor((safe % HOUR) / MINUTE)
  const s = safe % MINUTE
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}

/**
 * "18h 20m" — the summary format used by every total.
 *
 * Under a minute it drops to seconds ("42s") rather than rounding to "0m",
 * which read as though no time had been tracked at all.
 */
export function formatHoursMinutes(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds))
  if (safe < MINUTE) return `${safe}s`
  const h = Math.floor(safe / HOUR)
  const m = Math.floor((safe % HOUR) / MINUTE)
  if (h === 0) return `${m}m`
  return `${h}h ${String(m).padStart(2, '0')}m`
}

/** "02:30" — hours:minutes, for table cells where seconds are noise. */
export function formatHm(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds))
  const h = Math.floor(safe / HOUR)
  const m = Math.floor((safe % HOUR) / MINUTE)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Seconds an entry represents. A running entry has `duration` 0 in the
 * database — its elapsed time is always derived from `startTime`, so a tab left
 * closed for an hour still reports the hour.
 */
export function entrySeconds(entry: TimeEntry, now: number = Date.now()) {
  if (entry.status === 'running') {
    return Math.max(0, Math.floor((now - new Date(entry.startTime).getTime()) / 1000))
  }
  return entry.duration
}

export function totalSeconds(entries: TimeEntry[], now: number = Date.now()) {
  return entries.reduce((sum, entry) => sum + entrySeconds(entry, now), 0)
}

/** "09:00" in local time from an ISO timestamp. */
export function toTimeInput(iso: string) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** yyyy-MM-dd in local time from an ISO timestamp. */
export function toDateInput(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

/** ISO timestamp from a local yyyy-MM-dd plus HH:mm. */
export function combineDateTime(dateKey: string, time: string) {
  const [y, m, d] = dateKey.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0).toISOString()
}

/**
 * Start/end pair for a manual entry. Validates that end is strictly after start.
 */
export function manualRange(dateKey: string, start: string, end: string) {
  const startIso = combineDateTime(dateKey, start)
  const endIso = combineDateTime(dateKey, end)
  const startMs = new Date(startIso).getTime()
  const endMs = new Date(endIso).getTime()
  const isValid = endMs > startMs
  const duration = isValid ? Math.floor((endMs - startMs) / 1000) : 0

  return {
    startTime: startIso,
    endTime: endIso,
    duration,
    isValid,
  }
}

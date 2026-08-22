import { useEffect, useMemo, useState } from 'react'
import { useSession } from '@/hooks/useSession'
import {
  useCreateTimeEntry,
  useDeleteTimeEntry,
  useTimeEntries,
  useUpdateTimeEntry,
} from '@/hooks/useTimeTracker'
import { toDateInput } from '@/lib/time'
import type { TimeEntry } from '@/types'

/**
 * Whose time this is: always the signed-in person. The tracker is written from
 * each person's own point of view — there is no "track as someone else", so an
 * entry can't be filed under the wrong name by accident.
 */
export function useTrackingUser() {
  const { displayName } = useSession()
  return displayName
}

/** Re-renders once a second so a running timer counts up. Idle when there's
 *  nothing running — no interval is created at all. */
export function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [active])
  return now
}

/**
 * The running timer, read from the database rather than from component state.
 *
 * That's what makes it survive navigation, a reload, or a second tab: the
 * timer *is* a `time_entries` row with status `running`, so any page that asks
 * sees the same one, and closing the laptop doesn't lose the elapsed time.
 */
export function useActiveTimer() {
  const userName = useTrackingUser()
  const { data: entries = [] } = useTimeEntries()
  const createEntry = useCreateTimeEntry()
  const updateEntry = useUpdateTimeEntry()
  const deleteEntry = useDeleteTimeEntry()

  const running = useMemo(
    () => entries.find((e) => e.status === 'running' && e.userName === userName) ?? null,
    [entries, userName],
  )

  /** Everyone else's running timers — the input to the conflict warning. */
  const othersRunning = useMemo(
    () => entries.filter((e) => e.status === 'running' && e.userName !== userName),
    [entries, userName],
  )

  /** Under this, a stop is a mis-click rather than work, and is discarded. */
  const MIN_KEEP_SECONDS = 60

  /**
   * Returns how many seconds were saved, or null if the entry was discarded
   * for being too short — the caller decides what to say about it.
   */
  const stop = async (entry: TimeEntry | null = running) => {
    if (!entry) return undefined
    const endTime = new Date()
    const duration = Math.max(
      1,
      Math.floor((endTime.getTime() - new Date(entry.startTime).getTime()) / 1000),
    )

    // A twelve-second entry is a double-click, not data. Deleting it here is
    // what stops 00:00 rows accumulating in the history for someone to clean
    // up by hand later.
    if (duration < MIN_KEEP_SECONDS) {
      await deleteEntry.mutateAsync(entry.id)
      return null
    }

    await updateEntry.mutateAsync({
      id: entry.id,
      patch: { endTime: endTime.toISOString(), duration, status: 'completed' },
    })
    return duration
  }

  const start = async (workItemId: string, description: string) => {
    // The database holds a partial unique index on one running entry per user,
    // so stop first rather than letting the insert fail.
    if (running) await stop(running)
    const startTime = new Date().toISOString()
    return createEntry.mutateAsync({
      userName,
      workItemId,
      description: description.trim(),
      startTime,
      endTime: null,
      duration: 0,
      date: toDateInput(startTime),
      status: 'running',
    })
  }

  /** Live description edits land on the running row so a stop can't lose them. */
  const setRunningDescription = async (description: string) => {
    if (!running || running.description === description) return
    return updateEntry.mutateAsync({ id: running.id, patch: { description } })
  }

  /** Whoever else is currently on this exact work item. Different work items in
   *  the same project are never a conflict — only the same id counts. */
  const conflictsFor = (workItemId: string) =>
    othersRunning.filter((e) => e.workItemId === workItemId)

  return {
    userName,
    running,
    othersRunning,
    start,
    stop,
    setRunningDescription,
    conflictsFor,
    isMutating: createEntry.isPending || updateEntry.isPending || deleteEntry.isPending,
  }
}

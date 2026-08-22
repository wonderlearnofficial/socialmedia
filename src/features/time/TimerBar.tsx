import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Play, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { entrySeconds, formatDuration } from '@/lib/time'
import { cn } from '@/lib/utils'
import type { TimeEntry } from '@/types'
import { ConflictDialog } from './ConflictDialog'
import { useActiveTimer, useNow } from './useActiveTimer'
import type { WorkItemView } from './useTimeData'
import { WorkItemSelector } from './WorkItemSelector'

interface TimerBarProps {
  workItems: WorkItemView[]
  workItemById: Map<string, WorkItemView>
  recentIds: string[]
}

/**
 * The hero control: pick work, start, stop. Everything
 * else on the page is a record of what this produced.
 */
export function TimerBar({ workItems, workItemById, recentIds }: TimerBarProps) {
  const { t } = useTranslation()
  const { userName, running, start, stop, conflictsFor, isMutating } = useActiveTimer()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [conflicts, setConflicts] = useState<TimeEntry[]>([])
  const [switchPrompt, setSwitchPrompt] = useState(false)

  const now = useNow(Boolean(running))
  const elapsed = running ? entrySeconds(running, now) : 0
  const runningView = running ? workItemById.get(running.workItemId) : undefined
  const selectedView = selectedId ? workItemById.get(selectedId) : undefined

  // While a timer runs, the selector follows it; picking something else is how
  // you switch work.
  useEffect(() => {
    if (running) {
      setSelectedId(running.workItemId)
    }
  }, [running?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const isRunningSelection = Boolean(running && selectedId === running.workItemId)

  const handleSelect = (id: string | null) => {
    setSelectedId(id)
    if (!id || id === running?.workItemId) return
    // Warn at selection time, while it's still cheap to pick something else.
    const clashes = conflictsFor(id)
    if (clashes.length > 0) setConflicts(clashes)
  }

  const beginTimer = async (workItemId: string) => {
    try {
      await start(workItemId, '')
    } catch {
      toast.error(t('common.errorTitle'))
    }
  }

  const handleStart = () => {
    if (!selectedId) return
    // Never two timers at once — say what's running and let them decide.
    if (running) {
      setSwitchPrompt(true)
      return
    }
    void beginTimer(selectedId)
  }

  const handleStop = async () => {
    try {
      const saved = await stop()
      setSelectedId(null)
      // `null` means it was under a minute and thrown away — say so plainly
      // rather than claiming something was saved.
      toast.success(saved === null ? t('time.entryDiscarded') : t('time.entrySaved'))
    } catch {
      toast.error(t('common.errorTitle'))
    }
  }

  return (
    <div
      className={cn(
        'rounded-lg border bg-card transition-colors',
        running && 'border-emerald-500/40',
      )}
    >
      <div className="flex flex-col gap-2 p-3 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <WorkItemSelector
            value={selectedId}
            onSelect={handleSelect}
            workItems={workItems}
            recentIds={recentIds}
            createdBy={userName}
          />
        </div>

        <div className="flex items-center justify-end gap-3">
          <span
            className={cn(
              'font-mono text-lg tabular-nums',
              running ? 'text-emerald-400' : 'text-muted-foreground',
            )}
          >
            {formatDuration(elapsed)}
          </span>
          {isRunningSelection ? (
            <Button
              onClick={handleStop}
              disabled={isMutating}
              variant="destructive"
              className="w-24"
            >
              <Square />
              {t('time.stop')}
            </Button>
          ) : (
            <Button onClick={handleStart} disabled={!selectedId || isMutating} className="w-24">
              <Play />
              {t('time.start')}
            </Button>
          )}
        </div>
      </div>

      <ConflictDialog
        open={conflicts.length > 0}
        workItemName={selectedView?.item.name ?? ''}
        entries={conflicts}
        onContinue={() => setConflicts([])}
        onCancel={() => {
          setConflicts([])
          setSelectedId(running?.workItemId ?? null)
        }}
      />

      <Dialog open={switchPrompt} onOpenChange={(next) => !next && setSwitchPrompt(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('time.alreadyTracking')}</DialogTitle>
            <DialogDescription>{t('time.alreadyTrackingBody')}</DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border p-3">
            <p className="truncate text-sm font-medium">
              {runningView?.item.name ?? t('time.unknownWorkItem')}
            </p>
            <p className="truncate text-xs text-muted-foreground">{runningView?.path}</p>
            <p className="mt-1 font-mono text-sm tabular-nums text-emerald-400">
              {formatDuration(elapsed)}
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSwitchPrompt(false)}>
              {t('editor.cancel')}
            </Button>
            <Button
              onClick={() => {
                setSwitchPrompt(false)
                if (selectedId) void beginTimer(selectedId)
              }}
            >
              {t('time.stopAndStartNew')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

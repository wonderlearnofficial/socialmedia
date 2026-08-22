import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useWorkItems } from '@/hooks/useTimeTracker'
import { entrySeconds, formatDuration } from '@/lib/time'
import { cn } from '@/lib/utils'
import { useActiveTimer, useNow } from './useActiveTimer'

/**
 * The running timer, wherever you are in the app. It reads the same `running`
 * row the Time Tracker page does, so navigating away doesn't pause anything —
 * there is nothing in component state to lose.
 */
export function GlobalTimerIndicator({
  compact = false,
  className,
}: {
  compact?: boolean
  className?: string
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { running } = useActiveTimer()
  const { data: workItems = [] } = useWorkItems()
  const now = useNow(Boolean(running))

  if (!running) return null

  const item = workItems.find((w) => w.id === running.workItemId)
  const elapsed = formatDuration(entrySeconds(running, now))

  return (
    <button
      type="button"
      onClick={() => navigate('/time')}
      title={item?.name ?? t('time.title')}
      aria-label={t('time.openRunningTimer', { time: elapsed })}
      className={cn(
        'flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 transition-colors hover:bg-emerald-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50',
        compact ? 'size-9 justify-center p-0' : 'w-full px-2.5 py-2 text-start',
        className,
      )}
    >
      <span className="relative flex size-2 shrink-0">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
      </span>
      {!compact && (
        <span className="min-w-0 flex-1">
          <span className="block font-mono text-xs tabular-nums">{elapsed}</span>
          <span className="block truncate text-[10px] text-emerald-300/70">
            {item?.name ?? t('time.unknownWorkItem')}
          </span>
        </span>
      )}
    </button>
  )
}

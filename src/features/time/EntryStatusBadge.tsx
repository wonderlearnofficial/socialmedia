import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { TimeEntryStatus } from '@/types'

const STATUS_CLASS: Record<TimeEntryStatus, string> = {
  running: 'border-transparent bg-emerald-500/15 text-emerald-400',
  completed: 'border-transparent bg-muted text-muted-foreground',
  manual: 'border-transparent bg-sky-500/15 text-sky-400',
  edited: 'border-transparent bg-amber-500/15 text-amber-400',
}

/** `completed` is the unremarkable case, so it doesn't get a badge at all —
 *  the point of this is spotting time that wasn't tracked live. */
export function EntryStatusBadge({
  status,
  className,
}: {
  status: TimeEntryStatus
  className?: string
}) {
  const { t } = useTranslation()
  if (status === 'completed') return null
  return (
    <Badge className={cn(STATUS_CLASS[status], className)}>{t(`time.entryStatus.${status}`)}</Badge>
  )
}

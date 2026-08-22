import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { WorkItemStatus } from '@/types'

const STATUS_CLASS: Record<WorkItemStatus, string> = {
  backlog: 'border-transparent bg-muted text-muted-foreground',
  todo: 'border-transparent bg-sky-500/15 text-sky-400',
  in_progress: 'border-transparent bg-amber-500/15 text-amber-400',
  review: 'border-transparent bg-violet-500/15 text-violet-400',
  completed: 'border-transparent bg-emerald-500/15 text-emerald-400',
}

export function WorkItemStatusBadge({
  status,
  className,
}: {
  status: WorkItemStatus
  className?: string
}) {
  const { t } = useTranslation()
  return (
    <Badge className={cn(STATUS_CLASS[status], className)}>
      {t(`time.workItemStatus.${status}`)}
    </Badge>
  )
}

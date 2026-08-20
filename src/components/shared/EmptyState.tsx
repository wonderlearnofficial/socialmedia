import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  body?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, body, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-6 py-14 text-center',
        className,
      )}
    >
      <div className="grid size-11 place-items-center rounded-full border bg-muted/50 text-muted-foreground">
        <Icon className="size-5" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        {body && <p className="mx-auto max-w-xs text-xs text-muted-foreground">{body}</p>}
      </div>
      {action}
    </div>
  )
}

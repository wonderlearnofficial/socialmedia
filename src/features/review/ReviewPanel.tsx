import { useTranslation } from 'react-i18next'
import { CheckCircle2, MessageSquare, RotateCcw } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { STATUS_META } from '@/lib/constants'
import { formatTimestamp } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { Feedback } from '@/types'

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

/** The conversation between manager and owner for a single post. */
export function ReviewPanel({ feedback }: { feedback: Feedback[] }) {
  const { t, i18n } = useTranslation()

  if (feedback.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
        {t('review.noComments')}
      </p>
    )
  }

  return (
    <ol className="space-y-3">
      {[...feedback]
        .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
        .map((entry) => {
          const isStatus = entry.kind === 'status_change' && entry.status
          const meta = entry.status ? STATUS_META[entry.status] : null
          const Icon =
            entry.status === 'waiting_to_post'
              ? CheckCircle2
              : entry.status === 'changes_required'
                ? RotateCcw
                : MessageSquare

          return (
            <li key={entry.id} className="flex gap-3">
              <Avatar className="size-7">
                <AvatarFallback
                  className={cn(
                    'text-[10px]',
                    entry.role === 'owner' && 'bg-primary/15 text-primary',
                  )}
                >
                  {initials(entry.author)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-xs font-medium">{entry.author}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {formatTimestamp(entry.createdAt, i18n.language)}
                  </span>
                </div>

                {entry.message && (
                  <p className="mt-1 rounded-lg rounded-ss-none border bg-muted/40 px-3 py-2 text-xs leading-relaxed">
                    {entry.message}
                  </p>
                )}

                {isStatus && meta && (
                  <span
                    className={cn(
                      'mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-medium',
                      meta.text,
                    )}
                  >
                    <Icon className="size-3" />
                    {entry.status === 'waiting_to_post'
                      ? t('review.completedEvent')
                      : entry.status === 'changes_required'
                        ? t('review.changesEvent')
                        : t('review.statusEvent', { status: t(meta.labelKey) })}
                  </span>
                )}
              </div>
            </li>
          )
        })}
    </ol>
  )
}

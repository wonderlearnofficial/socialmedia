import { useTranslation } from 'react-i18next'
import { STATUS_META } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { PostStatus } from '@/types'

interface StatusBadgeProps {
  status: PostStatus
  /** `dot` is bare (calendar accent); `chip`/`inline` are dot + label text — no pill chrome. */
  variant?: 'chip' | 'dot' | 'inline'
  className?: string
}

export function StatusBadge({ status, variant = 'chip', className }: StatusBadgeProps) {
  const { t } = useTranslation()
  const meta = STATUS_META[status]
  const label = t(meta.labelKey)

  if (variant === 'dot') {
    return (
      <span
        className={cn('inline-block size-1.5 shrink-0 rounded-full', meta.dot, className)}
        title={label}
      />
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] font-medium',
        meta.text,
        className,
      )}
    >
      <span className={cn('size-1.5 shrink-0 rounded-full', meta.dot)} />
      {label}
    </span>
  )
}

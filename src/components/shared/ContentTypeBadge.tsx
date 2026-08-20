import { useTranslation } from 'react-i18next'
import { CONTENT_TYPE_META } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { ContentType } from '@/types'

export function ContentTypeBadge({
  type,
  className,
  showLabel = true,
}: {
  type: ContentType
  className?: string
  showLabel?: boolean
}) {
  const { t } = useTranslation()
  const meta = CONTENT_TYPE_META[type]
  const Icon = meta.icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground',
        className,
      )}
    >
      <Icon className="size-3" />
      {showLabel && t(meta.labelKey)}
    </span>
  )
}

import { useTranslation } from 'react-i18next'
import { PlatformIconGroup } from '@/components/shared/PlatformBadge'
import { MediaThumb } from '@/features/media/MediaThumb'
import { STATUS_META } from '@/lib/constants'
import { formatTime } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { Post } from '@/types'

/**
 * The compact card rendered inside a calendar day: thumbnail, platform, title,
 * time, and status as colour (accent bar + dot). Never the caption — the month
 * grid is for scanning, and every extra line costs a row of the visible plan.
 */
export function CalendarPost({ post, compact = false }: { post: Post; compact?: boolean }) {
  const { t, i18n } = useTranslation()
  const meta = STATUS_META[post.status]

  return (
    <div
      className="group/post flex w-full select-none cursor-grab active:cursor-grabbing gap-1.5 overflow-hidden rounded-md py-1 pe-1.5 ps-1 text-start transition-colors hover:bg-accent/50"
      title={`${post.title} · ${t(meta.labelKey)}`}
    >
      <span className={cn('w-0.5 shrink-0 self-stretch rounded-full', meta.dot)} />

      <MediaThumb post={post} className="size-7 pointer-events-none select-none rounded-md" />

      <div className="min-w-0 flex-1 pointer-events-none">
        <div className="flex items-center gap-1">
          <PlatformIconGroup platforms={post.platforms} max={3} iconClassName="size-3" />
          <span className="ms-auto flex shrink-0 items-center gap-1">
            <span className={cn('size-1.5 rounded-full', meta.dot)} />
            <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
              {formatTime(post.time, i18n.language)}
            </span>
          </span>
        </div>
        <p
          className={cn(
            'truncate text-[11px] font-medium leading-tight',
            compact ? 'mt-0' : 'mt-0.5',
          )}
        >
          {post.title}
        </p>
      </div>
    </div>
  )
}

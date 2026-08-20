import { useTranslation } from 'react-i18next'
import { ChevronRight } from 'lucide-react'
import { ContentTypeBadge } from '@/components/shared/ContentTypeBadge'
import { PlatformIconGroup } from '@/components/shared/PlatformBadge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatDateShort, formatTime } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { Post } from '@/types'
import { MediaThumb } from '@/features/media/MediaThumb'

interface PostRowProps {
  post: Post
  onClick?: () => void
  showDate?: boolean
  className?: string
}

/** The full-width post row used in day modals, list view and the mobile agenda. */
export function PostRow({ post, onClick, showDate = false, className }: PostRowProps) {
  const { t, i18n } = useTranslation()

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-start transition-all hover:border-primary/40 hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
        className,
      )}
    >
      <MediaThumb post={post} />

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <PlatformIconGroup platforms={post.platforms} />
          <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
            {showDate && `${formatDateShort(post.date, i18n.language)} · `}
            {formatTime(post.time, i18n.language)}
          </span>
        </div>
        <p className="truncate text-sm font-medium leading-tight">{post.title}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={post.status} />
          <ContentTypeBadge type={post.contentType} />
          {post.topic && (
            <span className="hidden text-[11px] text-muted-foreground sm:inline">{post.topic}</span>
          )}
        </div>
      </div>

      <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
      <span className="sr-only">{t('post.details')}</span>
    </button>
  )
}

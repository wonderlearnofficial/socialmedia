import { useEffect, useState } from 'react'
import { CONTENT_TYPE_META } from '@/lib/constants'
import { detectMedia } from '@/lib/media'
import { cn } from '@/lib/utils'
import type { Post } from '@/types'

/** Small square thumbnail for day lists and post rows. Falls back to a type glyph. */
export function MediaThumb({ post, className }: { post: Post; className?: string }) {
  const [failed, setFailed] = useState(false)
  const media = post.contentUrl ? detectMedia(post.contentUrl) : null
  const src =
    post.mediaPreview ??
    (media?.kind === 'image' || media?.provider === 'google-drive' ? media.previewUrl : undefined)
  const Icon = CONTENT_TYPE_META[post.contentType].icon

  useEffect(() => {
    setFailed(false)
  }, [src])

  return (
    <div
      className={cn(
        'relative size-11 shrink-0 overflow-hidden rounded-lg border bg-muted/60',
        className,
      )}
    >
      {src && !failed ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
          draggable={false}
          className="size-full select-none pointer-events-none object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="grid size-full select-none pointer-events-none place-items-center text-muted-foreground">
          <Icon className="size-4" />
        </span>
      )}
    </div>
  )
}

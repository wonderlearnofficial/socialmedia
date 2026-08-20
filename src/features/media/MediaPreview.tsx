import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ExternalLink, ImageOff, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CONTENT_TYPE_META } from '@/lib/constants'
import { detectMedia, fileNameFromUrl, type MediaProviderId } from '@/lib/media'
import { cn } from '@/lib/utils'
import type { Post } from '@/types'
import { MediaProviderBadge } from './MediaProviderBadge'

type LoadState = 'idle' | 'loaded' | 'failed'

/** Providers whose label doesn't read as a destination in "Open in …". */
const GENERIC_PROVIDERS = new Set<MediaProviderId>(['image', 'video', 'link'])

interface MediaPreviewProps {
  post: Post
  className?: string
  /** Aspect of the preview frame. */
  aspect?: 'square' | 'video' | 'portrait' | 'auto'
}

/**
 * Large media preview. Every remote source is treated as untrusted — a failed
 * image or video collapses into a labelled fallback card rather than a broken box.
 */
export function MediaPreview({ post, className, aspect = 'auto' }: MediaPreviewProps) {
  const { t } = useTranslation()
  const [state, setState] = useState<LoadState>('idle')

  const media = useMemo(
    () => (post.contentUrl ? detectMedia(post.contentUrl) : null),
    [post.contentUrl],
  )

  // Prefer an explicit thumbnail, then a provider-derived preview.
  const imageSrc = post.mediaPreview ?? (media?.kind === 'image' ? media.previewUrl : undefined)
  const videoSrc = media?.kind === 'video' ? media.previewUrl : undefined
  const source = videoSrc ?? imageSrc ?? media?.previewUrl

  useEffect(() => {
    setState('idle')
  }, [source])

  const fileName =
    post.contentFileName ?? (post.contentUrl ? fileNameFromUrl(post.contentUrl) : null)

  const TypeIcon = CONTENT_TYPE_META[post.contentType].icon

  const frame = cn(
    'relative overflow-hidden rounded-xl border bg-muted/40',
    aspect === 'square' && 'aspect-square',
    aspect === 'video' && 'aspect-video',
    aspect === 'portrait' && 'aspect-4/5',
    aspect === 'auto' && 'min-h-56',
    className,
  )

  // Nothing attached at all.
  if (!source && !post.contentUrl) {
    return (
      <div className={cn(frame, 'grid place-items-center')}>
        <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
          <TypeIcon className="size-6" />
          <p className="text-xs">{t('post.noMedia')}</p>
        </div>
      </div>
    )
  }

  // Attached, but not previewable here (Drive permissions, Figma, Canva, …).
  const unpreviewable = !source || state === 'failed'
  if (unpreviewable) {
    return (
      <div className={cn(frame, 'grid place-items-center bg-card')}>
        <div className="flex max-w-xs flex-col items-center gap-3 px-6 py-10 text-center">
          <div className="grid size-11 place-items-center rounded-full border bg-muted/60 text-muted-foreground">
            <ImageOff className="size-5" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">{t('post.previewUnavailable')}</p>
            <p className="text-xs text-muted-foreground">{t('post.previewUnavailableBody')}</p>
            {fileName && (
              <p className="truncate pt-1 font-mono text-[11px] text-muted-foreground">
                {fileName}
              </p>
            )}
          </div>
          {post.contentUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(post.contentUrl, '_blank', 'noopener,noreferrer')}
            >
              <ExternalLink className="size-3.5" />
              {/* Named providers read well ("Open in Google Drive"); generic
                  image/video/link sources do not, so fall back to a plain label. */}
              {media && !GENERIC_PROVIDERS.has(media.provider)
                ? t('post.openIn', { provider: media.label })
                : t('post.openOriginal')}
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={cn(frame, 'group bg-black/40')}>
      {videoSrc ? (
        <video
          src={videoSrc}
          poster={post.mediaPreview}
          controls
          playsInline
          preload="metadata"
          className="size-full object-contain"
          onError={() => setState('failed')}
          onLoadedMetadata={() => setState('loaded')}
        />
      ) : (
        <img
          src={source}
          alt={post.title}
          loading="lazy"
          className="size-full object-cover"
          onError={() => setState('failed')}
          onLoad={() => setState('loaded')}
        />
      )}

      {/* Video-typed posts that only have a still get a play affordance. */}
      {!videoSrc && (post.contentType === 'video' || post.contentType === 'reel') && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="grid size-12 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm">
            <Play className="size-5 fill-current" />
          </span>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-center justify-between gap-2">
        {media && <MediaProviderBadge provider={media.provider} label={media.label} />}
        {fileName && (
          <span className="max-w-[60%] truncate rounded-full border bg-card/80 px-2 py-0.5 text-[11px] font-medium text-muted-foreground backdrop-blur">
            {fileName}
          </span>
        )}
      </div>
    </div>
  )
}

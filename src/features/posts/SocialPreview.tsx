import { useState } from 'react'
import { Bookmark, Heart, MessageCircle, MoreHorizontal, Repeat2, Send, Share } from 'lucide-react'
import { PlatformIcon } from '@/components/shared/PlatformIcon'
import { PLATFORM_META } from '@/lib/constants'
import { detectMedia } from '@/lib/media'
import { cn } from '@/lib/utils'
import type { Post, SocialPlatform } from '@/types'

function PreviewMedia({ post, className }: { post: Post; className?: string }) {
  const [failed, setFailed] = useState(false)
  const media = post.contentUrl ? detectMedia(post.contentUrl) : null
  const src = post.mediaPreview ?? (media?.kind === 'image' ? media.previewUrl : undefined)

  if (!src || failed) {
    return <div className={cn('bg-muted', className)} />
  }
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      className={cn('object-cover', className)}
      onError={() => setFailed(true)}
    />
  )
}

/** Approximate in-feed rendering so the owner can judge the post in context. */
export function SocialPreview({
  post,
  platform,
  handle = 'wonderlearn',
}: {
  post: Post
  platform: SocialPlatform
  handle?: string
}) {
  const meta = PLATFORM_META[platform]

  const header = (
    <div className="flex items-center gap-2 p-3">
      <div className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary/70 to-primary text-[10px] font-bold text-primary-foreground">
        WL
      </div>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-xs font-semibold">{handle}</p>
        <p className="truncate text-[10px] text-muted-foreground">{post.topic || meta.label}</p>
      </div>
      <MoreHorizontal className="size-4 shrink-0 text-muted-foreground" />
    </div>
  )

  const caption = (
    <p className="whitespace-pre-wrap px-3 pb-3 text-xs leading-relaxed">
      <span className="font-semibold">{handle}</span> {post.caption}
    </p>
  )

  if (platform === 'x') {
    return (
      <article className="overflow-hidden rounded-xl border bg-card">
        <div className="flex gap-2.5 p-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary/70 to-primary text-[10px] font-bold text-primary-foreground">
            WL
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-semibold">Wonderlearn</span>
              <span className="text-muted-foreground">@{handle}</span>
              <PlatformIcon platform="x" className="ms-auto size-3.5 text-muted-foreground" />
            </div>
            <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed">{post.caption}</p>
            {(post.mediaPreview || post.contentUrl) && (
              <PreviewMedia post={post} className="mt-2 h-44 w-full rounded-xl border" />
            )}
            <div className="mt-2.5 flex max-w-64 items-center justify-between text-muted-foreground">
              <MessageCircle className="size-3.5" />
              <Repeat2 className="size-3.5" />
              <Heart className="size-3.5" />
              <Share className="size-3.5" />
            </div>
          </div>
        </div>
      </article>
    )
  }

  if (platform === 'tiktok' || (platform === 'instagram' && post.contentType === 'reel')) {
    return (
      <article className="relative mx-auto aspect-9/16 max-h-[26rem] w-full max-w-64 overflow-hidden rounded-xl border bg-black">
        <PreviewMedia post={post} className="absolute inset-0 size-full opacity-90" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-3 pt-10">
          <p className="text-[11px] font-semibold text-white">@{handle}</p>
          <p className="mt-1 line-clamp-3 text-[11px] leading-snug text-white/90">{post.caption}</p>
        </div>
        <div className="absolute end-2 bottom-16 flex flex-col items-center gap-3 text-white">
          <Heart className="size-5" />
          <MessageCircle className="size-5" />
          <Send className="size-5" />
        </div>
        <PlatformIcon platform={platform} className="absolute end-2 top-2 size-4 text-white" />
      </article>
    )
  }

  if (platform === 'youtube') {
    return (
      <article className="overflow-hidden rounded-xl border bg-card">
        <PreviewMedia post={post} className="aspect-video w-full" />
        <div className="flex gap-2.5 p-3">
          <div className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary/70 to-primary text-[10px] font-bold text-primary-foreground">
            WL
          </div>
          <div className="min-w-0">
            <p className="line-clamp-2 text-xs font-semibold leading-snug">{post.title}</p>
            <p className="mt-1 truncate text-[10px] text-muted-foreground">
              Wonderlearn · 12K views · 2 hours ago
            </p>
          </div>
        </div>
      </article>
    )
  }

  // Instagram / Facebook feed
  return (
    <article className="overflow-hidden rounded-xl border bg-card">
      {header}
      <PreviewMedia
        post={post}
        className={cn('w-full', platform === 'instagram' ? 'aspect-square' : 'aspect-video')}
      />
      <div className="flex items-center gap-3 px-3 pt-3 text-muted-foreground">
        <Heart className="size-4" />
        <MessageCircle className="size-4" />
        <Send className="size-4" />
        {platform === 'instagram' && <Bookmark className="ms-auto size-4" />}
      </div>
      {caption}
    </article>
  )
}

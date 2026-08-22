import { useEffect, useMemo, useState } from 'react'
import {
  Bookmark,
  Globe,
  Heart,
  MessageCircle,
  MessageSquare,
  MoreHorizontal,
  Music2,
  Repeat2,
  Send,
  Share,
  Share2,
  ThumbsUp,
} from 'lucide-react'
import { BrandMark } from '@/components/shared/Brand'
import { PlatformIcon } from '@/components/shared/PlatformIcon'
import { PLATFORM_META } from '@/lib/constants'
import {
  detectMedia,
  driveDirectViewUrl,
  driveFilePreviewUrl,
  driveThumbnailFallbackUrl,
  driveThumbnailUrl,
  googleDriveFileId,
} from '@/lib/media'
import { cn } from '@/lib/utils'
import type { Post, SocialPlatform } from '@/types'

function PreviewMedia({ post, className }: { post: Post; className?: string }) {
  const [index, setIndex] = useState(0)
  const [useIframe, setUseIframe] = useState(false)

  const media = useMemo(
    () => (post.contentUrl ? detectMedia(post.contentUrl) : null),
    [post.contentUrl],
  )
  const driveId = useMemo(
    () => post.driveFileId || (post.contentUrl ? googleDriveFileId(post.contentUrl) : null),
    [post.driveFileId, post.contentUrl],
  )

  const candidateSources = useMemo(() => {
    const list: string[] = []
    if (post.mediaPreview) list.push(post.mediaPreview)
    if (driveId) {
      list.push(driveThumbnailUrl(driveId, 1200))
      list.push(driveThumbnailFallbackUrl(driveId, 1200))
      list.push(driveDirectViewUrl(driveId))
    }
    if (media?.previewUrl && !list.includes(media.previewUrl)) {
      list.push(media.previewUrl)
    }
    if (post.contentUrl && !list.includes(post.contentUrl)) {
      list.push(post.contentUrl)
    }
    return list
  }, [post.mediaPreview, driveId, media?.previewUrl, post.contentUrl])

  useEffect(() => {
    setIndex(0)
    setUseIframe(false)
  }, [post.id, post.contentUrl, candidateSources])

  const currentSrc = candidateSources[index]

  const handleError = () => {
    if (index < candidateSources.length - 1) {
      setIndex((prev) => prev + 1)
    } else if (driveId && !useIframe) {
      setUseIframe(true)
    }
  }

  if (useIframe && driveId) {
    return (
      <div className={cn('relative overflow-hidden bg-black/60', className)}>
        <iframe
          src={driveFilePreviewUrl(driveId)}
          title={post.title}
          className="size-full border-0 pointer-events-none"
        />
      </div>
    )
  }

  if (!currentSrc || (index >= candidateSources.length && !useIframe)) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center bg-muted/30 text-muted-foreground p-6 text-center',
          className,
        )}
      >
        <span className="text-xs font-semibold text-neutral-300 truncate max-w-full">
          {post.contentFileName || post.title}
        </span>
      </div>
    )
  }

  const isVideo =
    post.contentType === 'video' || post.contentType === 'reel' || media?.kind === 'video'

  if (isVideo && currentSrc.match(/\.(mp4|webm|mov|m4v)(\?.*)?$/i)) {
    return (
      <video
        src={currentSrc}
        poster={post.mediaPreview}
        className={cn('size-full object-cover', className)}
        onError={handleError}
        muted
        playsInline
      />
    )
  }

  return (
    <img
      key={currentSrc}
      src={currentSrc}
      alt={post.title}
      loading="eager"
      className={cn('size-full object-cover', className)}
      onError={handleError}
    />
  )
}

function BrandAvatar({
  isDrWael,
  sizeClass = 'size-9',
}: {
  isDrWael: boolean
  sizeClass?: string
}) {
  if (isDrWael) {
    return (
      <div
        className={cn(
          'shrink-0 rounded-full bg-gradient-to-br from-[#0A66C2] to-blue-600 grid place-items-center text-xs font-bold text-white shadow-sm ring-1 ring-white/10',
          sizeClass,
        )}
      >
        DW
      </div>
    )
  }

  return (
    <div
      className={cn(
        'shrink-0 rounded-full bg-white grid place-items-center p-1 shadow-sm ring-1 ring-white/20 overflow-hidden',
        sizeClass,
      )}
    >
      <BrandMark className="size-full object-contain" />
    </div>
  )
}

/** Authentic in-feed mock rendering for each social media platform. */
export function SocialPreview({ post, platform }: { post: Post; platform: SocialPlatform }) {
  const isDrWael = post.workspace === 'dr_wael'
  const brandName = isDrWael ? 'Dr. Wael Elmayyah' : 'WonderLearn'
  const brandHandle = isDrWael ? 'drwaelelmayyah' : 'wonderlearn'

  // Instagram Post Mock
  if (platform === 'instagram') {
    if (post.contentType === 'reel') {
      return (
        <article className="relative mx-auto aspect-9/16 max-h-[30rem] w-full max-w-xs overflow-hidden rounded-2xl border border-white/[0.1] bg-black shadow-2xl">
          <PreviewMedia
            post={post}
            className="absolute inset-0 size-full opacity-90 object-cover"
          />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4 bg-gradient-to-b from-black/70 to-transparent">
            <span className="text-xs font-bold text-white tracking-wider uppercase">Reels</span>
            <PlatformIcon platform="instagram" className="size-4 text-white" />
          </div>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 pt-12 space-y-2">
            <div className="flex items-center gap-2">
              <BrandAvatar isDrWael={isDrWael} sizeClass="size-7" />
              <span className="text-xs font-semibold text-white">@{brandHandle}</span>
              <button
                type="button"
                className="rounded-lg border border-white/40 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-white/10"
              >
                Follow
              </button>
            </div>
            <p className="line-clamp-2 text-xs leading-snug text-white/95">
              {post.caption || post.title}
            </p>
            <div className="flex items-center gap-1.5 text-[10px] text-white/70">
              <Music2 className="size-3" />
              <span className="truncate">Original audio · {brandName}</span>
            </div>
          </div>
          <div className="absolute end-3 bottom-14 flex flex-col items-center gap-3 text-white">
            <div className="flex flex-col items-center gap-0.5">
              <Heart className="size-6" />
              <span className="text-[10px] font-semibold">1.4K</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <MessageCircle className="size-6" />
              <span className="text-[10px] font-semibold">42</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <Send className="size-6" />
            </div>
            <Bookmark className="size-5" />
          </div>
        </article>
      )
    }

    return (
      <article className="w-full max-w-sm overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111419] shadow-xl text-neutral-100">
        {/* Instagram Header */}
        <div className="flex items-center justify-between p-3.5 border-b border-white/[0.04]">
          <div className="flex items-center gap-2.5">
            <div className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 p-[1.5px]">
              <div className="size-full rounded-full bg-white grid place-items-center p-1 overflow-hidden">
                <BrandMark className="size-full object-contain" />
              </div>
            </div>
            <div className="leading-none">
              <span className="text-xs font-semibold text-white">{brandHandle}</span>
              {post.topic && <p className="text-[10px] text-neutral-400 mt-0.5">{post.topic}</p>}
            </div>
          </div>
          <MoreHorizontal className="size-4 text-neutral-400" />
        </div>

        {/* Media */}
        <div className="w-full aspect-square overflow-hidden bg-black/60 flex items-center justify-center">
          <PreviewMedia post={post} className="size-full object-cover" />
        </div>

        {/* Action bar */}
        <div className="p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-neutral-200">
              <Heart className="size-5 hover:text-red-500 cursor-pointer transition-colors" />
              <MessageCircle className="size-5 hover:text-white cursor-pointer" />
              <Send className="size-5 hover:text-white cursor-pointer" />
            </div>
            <Bookmark className="size-5 text-neutral-200 hover:text-white cursor-pointer" />
          </div>
          <p className="text-xs font-semibold text-white">128 likes</p>
          <div className="text-xs leading-relaxed">
            <span className="font-semibold text-white me-1.5">{brandHandle}</span>
            <span className="text-neutral-300">{post.caption || post.title}</span>
          </div>
          <p className="text-[10px] uppercase tracking-wider text-neutral-500 pt-1">2 HOURS AGO</p>
        </div>
      </article>
    )
  }

  // LinkedIn Post Mock
  if (platform === 'linkedin') {
    return (
      <article className="w-full max-w-md overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111419] shadow-xl text-neutral-100">
        <div className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <BrandAvatar isDrWael={isDrWael} sizeClass="size-10" />
              <div className="leading-tight">
                <p className="text-xs font-bold text-white hover:text-[#3897F0] cursor-pointer">
                  {brandName}
                </p>
                <p className="text-[11px] text-neutral-400">
                  {isDrWael ? 'Founder & Keynote Speaker' : '24,850 followers'}
                </p>
                <p className="flex items-center gap-1 text-[10px] text-neutral-500">
                  <span>1d · Edited ·</span>
                  <Globe className="size-2.5" />
                </p>
              </div>
            </div>
            <button
              type="button"
              className="text-xs font-semibold text-[#3897F0] hover:bg-[#0A66C2]/10 px-2.5 py-1 rounded-md"
            >
              + Follow
            </button>
          </div>

          {/* Caption */}
          <p className="whitespace-pre-wrap text-xs leading-relaxed text-neutral-200">
            {post.caption || post.title}
          </p>
        </div>

        {/* Media */}
        <div className="w-full aspect-video overflow-hidden bg-black/60 flex items-center justify-center">
          <PreviewMedia post={post} className="size-full object-cover" />
        </div>

        {/* Reaction summary & action bar */}
        <div className="px-4 py-2.5 border-t border-white/[0.04] space-y-2 text-xs">
          <div className="flex items-center justify-between text-[11px] text-neutral-400 border-b border-white/[0.04] pb-2">
            <span className="flex items-center gap-1">
              <span>👍 💡 ❤️</span>
              <span>184</span>
            </span>
            <span>22 comments · 5 reposts</span>
          </div>
          <div className="flex items-center justify-between pt-1 text-neutral-300 font-medium text-xs">
            <span className="flex items-center gap-1.5 hover:text-white cursor-pointer py-1 px-2 rounded-md hover:bg-white/[0.04]">
              <ThumbsUp className="size-3.5 text-[#3897F0]" /> Like
            </span>
            <span className="flex items-center gap-1.5 hover:text-white cursor-pointer py-1 px-2 rounded-md hover:bg-white/[0.04]">
              <MessageSquare className="size-3.5" /> Comment
            </span>
            <span className="flex items-center gap-1.5 hover:text-white cursor-pointer py-1 px-2 rounded-md hover:bg-white/[0.04]">
              <Repeat2 className="size-3.5" /> Repost
            </span>
            <span className="flex items-center gap-1.5 hover:text-white cursor-pointer py-1 px-2 rounded-md hover:bg-white/[0.04]">
              <Send className="size-3.5" /> Send
            </span>
          </div>
        </div>
      </article>
    )
  }

  // Facebook Post Mock
  if (platform === 'facebook') {
    return (
      <article className="w-full max-w-md overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111419] shadow-xl text-neutral-100">
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <BrandAvatar isDrWael={isDrWael} sizeClass="size-9" />
              <div>
                <p className="text-xs font-bold text-white">{brandName}</p>
                <p className="flex items-center gap-1 text-[10px] text-neutral-400">
                  <span>3h ·</span>
                  <Globe className="size-2.5" />
                </p>
              </div>
            </div>
            <MoreHorizontal className="size-4 text-neutral-400" />
          </div>
          <p className="whitespace-pre-wrap text-xs leading-relaxed text-neutral-200">
            {post.caption || post.title}
          </p>
        </div>

        <div className="w-full aspect-video overflow-hidden bg-black/60 flex items-center justify-center">
          <PreviewMedia post={post} className="size-full object-cover" />
        </div>

        <div className="px-4 py-2.5 border-t border-white/[0.04] space-y-2">
          <div className="flex items-center justify-between text-[11px] text-neutral-400 border-b border-white/[0.04] pb-2">
            <span>👍 ❤️ 96</span>
            <span>14 Comments · 4 Shares</span>
          </div>
          <div className="flex items-center justify-around pt-0.5 text-xs text-neutral-300 font-medium">
            <span className="flex items-center gap-1.5 hover:text-white cursor-pointer py-1 px-3 rounded-md hover:bg-white/[0.04]">
              <ThumbsUp className="size-3.5 text-[#1877F2]" /> Like
            </span>
            <span className="flex items-center gap-1.5 hover:text-white cursor-pointer py-1 px-3 rounded-md hover:bg-white/[0.04]">
              <MessageSquare className="size-3.5" /> Comment
            </span>
            <span className="flex items-center gap-1.5 hover:text-white cursor-pointer py-1 px-3 rounded-md hover:bg-white/[0.04]">
              <Share2 className="size-3.5" /> Share
            </span>
          </div>
        </div>
      </article>
    )
  }

  // X / Twitter Mock
  if (platform === 'x') {
    return (
      <article className="w-full max-w-md overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111419] p-4 shadow-xl text-neutral-100">
        <div className="flex gap-3">
          <BrandAvatar isDrWael={isDrWael} sizeClass="size-10" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-bold text-white truncate">{brandName}</span>
              <span className="text-neutral-400">@{brandHandle}</span>
              <span className="text-neutral-500">· 2h</span>
              <PlatformIcon platform="x" className="ms-auto size-3.5 text-neutral-400" />
            </div>

            <p className="whitespace-pre-wrap text-xs leading-relaxed text-neutral-200">
              {post.caption || post.title}
            </p>

            {(post.mediaPreview || post.contentUrl) && (
              <div className="mt-2 h-56 w-full rounded-xl border border-white/[0.08] bg-black/50 overflow-hidden">
                <PreviewMedia post={post} className="size-full object-cover" />
              </div>
            )}

            <div className="pt-2 flex items-center justify-between text-neutral-400 text-xs max-w-sm">
              <span className="flex items-center gap-1.5 hover:text-[#009FE2] cursor-pointer">
                <MessageCircle className="size-3.5" /> 18
              </span>
              <span className="flex items-center gap-1.5 hover:text-emerald-400 cursor-pointer">
                <Repeat2 className="size-3.5" /> 12
              </span>
              <span className="flex items-center gap-1.5 hover:text-pink-500 cursor-pointer">
                <Heart className="size-3.5" /> 94
              </span>
              <span className="flex items-center gap-1.5 hover:text-white cursor-pointer">
                <Bookmark className="size-3.5" /> 8
              </span>
              <Share className="size-3.5 hover:text-white cursor-pointer" />
            </div>
          </div>
        </div>
      </article>
    )
  }

  // TikTok Mock
  if (platform === 'tiktok') {
    return (
      <article className="relative mx-auto aspect-9/16 max-h-[30rem] w-full max-w-xs overflow-hidden rounded-2xl border border-white/[0.1] bg-black shadow-2xl">
        <PreviewMedia post={post} className="absolute inset-0 size-full opacity-90 object-cover" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 pt-12 space-y-2">
          <p className="text-xs font-bold text-white">@{brandHandle}</p>
          <p className="line-clamp-3 text-xs leading-snug text-white/95">
            {post.caption || post.title}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-white/80">
            <Music2 className="size-3" />
            <span className="truncate">♫ original sound - {brandName}</span>
          </div>
        </div>
        <div className="absolute end-3 bottom-14 flex flex-col items-center gap-3.5 text-white">
          <div className="flex flex-col items-center gap-0.5">
            <div className="grid size-9 place-items-center rounded-full bg-white/10 backdrop-blur">
              <Heart className="size-5 fill-white text-white" />
            </div>
            <span className="text-[10px] font-semibold">2.8K</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <div className="grid size-9 place-items-center rounded-full bg-white/10 backdrop-blur">
              <MessageCircle className="size-5 fill-white text-white" />
            </div>
            <span className="text-[10px] font-semibold">96</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <div className="grid size-9 place-items-center rounded-full bg-white/10 backdrop-blur">
              <Bookmark className="size-5 fill-white text-white" />
            </div>
            <span className="text-[10px] font-semibold">140</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <div className="grid size-9 place-items-center rounded-full bg-white/10 backdrop-blur">
              <Share2 className="size-5 text-white" />
            </div>
            <span className="text-[10px] font-semibold">Share</span>
          </div>
        </div>
      </article>
    )
  }

  // YouTube Mock
  return (
    <article className="w-full max-w-md overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111419] shadow-xl text-neutral-100">
      <div className="relative aspect-video w-full bg-black/60 overflow-hidden">
        <PreviewMedia post={post} className="size-full object-cover" />
        <span className="absolute end-2 bottom-2 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-semibold text-white">
          12:45
        </span>
      </div>
      <div className="flex gap-3 p-3.5">
        <BrandAvatar isDrWael={isDrWael} sizeClass="size-9" />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-xs font-semibold leading-snug text-white">{post.title}</p>
          <p className="mt-1 truncate text-[11px] text-neutral-400">
            {brandName} · 14K views · 3 hours ago
          </p>
        </div>
      </div>
    </article>
  )
}

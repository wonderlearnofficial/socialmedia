import { PLATFORM_META } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { SocialPlatform } from '@/types'
import { PlatformIcon } from './PlatformIcon'

interface PlatformBadgeProps {
  platform: SocialPlatform
  showLabel?: boolean
  className?: string
}

export function PlatformBadge({ platform, showLabel = true, className }: PlatformBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border bg-muted/60 px-2 py-0.5 text-[11px] font-medium',
        className,
      )}
    >
      <PlatformIcon platform={platform} brand className="size-3" />
      {showLabel && PLATFORM_META[platform].label}
    </span>
  )
}

interface PlatformIconGroupProps {
  platforms: SocialPlatform[]
  max?: number
  className?: string
  iconClassName?: string
  brand?: boolean
}

/** Compact icon row used on calendar cards and list rows. */
export function PlatformIconGroup({
  platforms,
  max = 4,
  className,
  iconClassName,
  brand = true,
}: PlatformIconGroupProps) {
  const shown = platforms.slice(0, max)
  const rest = platforms.length - shown.length
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      {shown.map((p) => (
        <PlatformIcon
          key={p}
          platform={p}
          brand={brand}
          title={PLATFORM_META[p].label}
          className={cn('size-3.5', iconClassName)}
        />
      ))}
      {rest > 0 && <span className="text-[10px] font-medium text-muted-foreground">+{rest}</span>}
    </span>
  )
}

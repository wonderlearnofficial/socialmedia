import { PLATFORM_META } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { SocialPlatform } from '@/types'

export interface PlatformIconProps extends React.SVGProps<SVGSVGElement> {
  platform: SocialPlatform
  /** Paint the official brand color instead of inheriting currentColor. */
  brand?: boolean
  /** Render as decoration (default) or expose the platform name to assistive tech. */
  title?: string
}

/**
 * The single source of truth for platform artwork. Official simple-icons paths,
 * sized through `className` (e.g. `size-4`) like every other icon in the app.
 */
export function PlatformIcon({
  platform,
  brand = false,
  className,
  title,
  ...props
}: PlatformIconProps) {
  const meta = PLATFORM_META[platform]
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn(
        'size-4 shrink-0',
        brand && 'text-(--brand) dark:text-(--brand-dark)',
        className,
      )}
      style={
        brand
          ? ({
              '--brand': meta.brand,
              '--brand-dark': meta.brandDark ?? meta.brand,
            } as React.CSSProperties)
          : undefined
      }
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <path d={meta.path} />
    </svg>
  )
}

export function platformLabel(platform: SocialPlatform) {
  return PLATFORM_META[platform].label
}

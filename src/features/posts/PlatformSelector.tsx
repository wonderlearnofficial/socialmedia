import { Check } from 'lucide-react'
import { PlatformIcon } from '@/components/shared/PlatformIcon'
import { PLATFORM_META } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { SOCIAL_PLATFORMS, type SocialPlatform } from '@/types'

interface PlatformSelectorProps {
  value: SocialPlatform[]
  onChange: (platforms: SocialPlatform[]) => void
  allowedPlatforms?: readonly SocialPlatform[]
  className?: string
}

/** Multi-select platform tiles. Selection state is unmistakable. */
export function PlatformSelector({
  value,
  onChange,
  allowedPlatforms,
  className,
}: PlatformSelectorProps) {
  const platforms =
    allowedPlatforms && allowedPlatforms.length > 0 ? allowedPlatforms : SOCIAL_PLATFORMS
  const isSingleLocked = platforms.length === 1

  const toggle = (platform: SocialPlatform) => {
    if (isSingleLocked) return
    if (value.includes(platform)) {
      // Must keep at least 1 social media platform selected
      if (value.length <= 1) return
      onChange(value.filter((p) => p !== platform))
    } else {
      onChange([...value, platform])
    }
  }

  return (
    <div
      className={cn(
        'grid gap-2',
        platforms.length === 1 ? 'grid-cols-1 max-w-xs' : 'grid-cols-2 sm:grid-cols-3',
        className,
      )}
    >
      {platforms.map((platform) => {
        const selected = value.includes(platform) || isSingleLocked
        return (
          <button
            key={platform}
            type="button"
            role="checkbox"
            aria-checked={selected}
            disabled={isSingleLocked}
            onClick={() => toggle(platform)}
            className={cn(
              'group relative flex min-w-0 items-center gap-2 rounded-lg border p-2 text-start transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
              selected
                ? 'border-primary bg-primary/10 text-white shadow-xs'
                : 'border-white/[0.08] bg-white/[0.02] text-neutral-300 hover:border-white/[0.16] hover:bg-white/[0.05] hover:text-white',
              isSingleLocked && 'cursor-default opacity-90',
            )}
          >
            <PlatformIcon
              platform={platform}
              brand
              className={cn(
                'size-4 shrink-0 transition-opacity',
                !selected && 'opacity-60 group-hover:opacity-100',
              )}
            />
            <span className="truncate text-xs font-medium">{PLATFORM_META[platform].label}</span>
            <span
              className={cn(
                'ms-auto grid size-4 shrink-0 place-items-center rounded-full border transition-colors',
                selected
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-white/[0.15] bg-white/[0.04]',
              )}
            >
              {selected && <Check className="size-2.5" strokeWidth={3} />}
            </span>
          </button>
        )
      })}
    </div>
  )
}

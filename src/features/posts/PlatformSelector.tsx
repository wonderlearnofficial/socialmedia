import { Check } from 'lucide-react'
import { PlatformIcon } from '@/components/shared/PlatformIcon'
import { PLATFORM_META } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { SOCIAL_PLATFORMS, type SocialPlatform } from '@/types'

interface PlatformSelectorProps {
  value: SocialPlatform[]
  onChange: (platforms: SocialPlatform[]) => void
  className?: string
}

/** Multi-select platform tiles. Selection state is unmistakable. */
export function PlatformSelector({ value, onChange, className }: PlatformSelectorProps) {
  const toggle = (platform: SocialPlatform) =>
    onChange(value.includes(platform) ? value.filter((p) => p !== platform) : [...value, platform])

  return (
    <div className={cn('grid grid-cols-2 gap-2 sm:grid-cols-3', className)}>
      {SOCIAL_PLATFORMS.map((platform) => {
        const selected = value.includes(platform)
        return (
          <button
            key={platform}
            type="button"
            role="checkbox"
            aria-checked={selected}
            onClick={() => toggle(platform)}
            className={cn(
              'group relative flex items-center gap-2.5 rounded-lg border p-2.5 text-start transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
              selected
                ? 'border-primary bg-primary/5 shadow-xs'
                : 'hover:border-foreground/20 hover:bg-accent/50',
            )}
          >
            <PlatformIcon
              platform={platform}
              brand
              className={cn(
                'size-4 transition-opacity',
                !selected && 'opacity-60 group-hover:opacity-100',
              )}
            />
            <span className="text-xs font-medium">{PLATFORM_META[platform].label}</span>
            <span
              className={cn(
                'ms-auto grid size-4 shrink-0 place-items-center rounded-full border transition-colors',
                selected ? 'border-primary bg-primary text-primary-foreground' : 'border-input',
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

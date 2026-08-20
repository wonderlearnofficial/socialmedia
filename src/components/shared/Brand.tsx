import { cn } from '@/lib/utils'

/**
 * The WonderLearn lockup. The supplied PNG wordmark is dark grey and would sink
 * into the dark theme, so only the colored cube is used as artwork — it reads on
 * both themes — and the wordmark is set in the app's own typeface.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}wonderlearn-mark.png`}
      alt=""
      width={40}
      height={40}
      className={cn('size-8 shrink-0 select-none object-contain', className)}
    />
  )
}

interface BrandLockupProps {
  /** Secondary line under the name. */
  subtitle?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function BrandLockup({ subtitle, size = 'md', className }: BrandLockupProps) {
  const mark = { sm: 'size-7', md: 'size-8', lg: 'size-11' }[size]
  const name = { sm: 'text-sm', md: 'text-[15px]', lg: 'text-xl' }[size]

  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <BrandMark className={mark} />
      <span className="min-w-0 leading-tight">
        <span className={cn('block truncate font-semibold tracking-tight', name)}>
          Wonder<span className="text-muted-foreground">learn</span>
        </span>
        {subtitle && (
          <span className="block truncate text-[11px] text-muted-foreground">{subtitle}</span>
        )}
      </span>
    </span>
  )
}

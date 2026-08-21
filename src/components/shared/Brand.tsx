import { cn } from '@/lib/utils'

/** Just the cube, no wordmark — its saturated colors read fine on any background. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}wonderlearn-icon.svg`}
      alt=""
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

const LOCKUP_HEIGHT = { sm: 'h-6', md: 'h-7', lg: 'h-10' }

export function BrandLockup({ subtitle, size = 'md', className }: BrandLockupProps) {
  const height = LOCKUP_HEIGHT[size]
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      {/* The colored-cube-and-dark-wordmark file reads fine in light mode but the
          wordmark sinks into dark chrome — the brand kit's all-white variant is
          the intended fix for exactly that, swapped in purely via CSS. */}
      <img
        src={`${import.meta.env.BASE_URL}wonderlearn-horizontal.svg`}
        alt="Wonderlearn"
        className={cn('w-auto shrink-0 select-none object-contain dark:hidden', height)}
      />
      <img
        src={`${import.meta.env.BASE_URL}wonderlearn-horizontal-white.svg`}
        alt="Wonderlearn"
        className={cn('hidden w-auto shrink-0 select-none object-contain dark:block', height)}
      />
      {subtitle && (
        <span className="min-w-0 truncate text-[11px] leading-tight text-muted-foreground">
          {subtitle}
        </span>
      )}
    </span>
  )
}

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
  /** Scale by container width instead of a fixed height — for a header that
   *  should show the logo as large as its own width allows, not inline-sized. */
  fluid?: boolean
  className?: string
}

const LOCKUP_HEIGHT = { sm: 'h-6', md: 'h-7', lg: 'h-10' }

export function BrandLockup({ subtitle, size = 'md', fluid, className }: BrandLockupProps) {
  const imgSize = fluid ? 'h-auto w-full max-w-40' : cn('w-auto', LOCKUP_HEIGHT[size])
  return (
    <span className={cn('flex items-center gap-2.5', fluid && 'w-full justify-center', className)}>
      {/* The colored-cube-and-dark-wordmark file reads fine in light mode but the
          wordmark sinks into dark chrome — the brand kit's all-white variant is
          the intended fix for exactly that, swapped in purely via CSS. */}
      <img
        src={`${import.meta.env.BASE_URL}wonderlearn-horizontal.svg`}
        alt="Wonderlearn"
        className={cn('shrink-0 select-none object-contain dark:hidden', imgSize)}
      />
      <img
        src={`${import.meta.env.BASE_URL}wonderlearn-horizontal-white.svg`}
        alt="Wonderlearn"
        className={cn('hidden shrink-0 select-none object-contain dark:block', imgSize)}
      />
      {subtitle && (
        <span className="min-w-0 truncate text-[11px] leading-tight text-muted-foreground">
          {subtitle}
        </span>
      )}
    </span>
  )
}

import { cn } from '@/lib/utils'

/** Just the cube, no wordmark — used where space is tight (e.g. the favicon-sized slot). */
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

const LOCKUP_HEIGHT = { sm: 'h-6', md: 'h-7', lg: 'h-10' }

export function BrandLockup({ subtitle, size = 'md', className }: BrandLockupProps) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      {/* The source lockup's wordmark is dark grey, drawn for a light background —
          on dark chrome it needs its own light plate behind it to stay legible. */}
      <span className="shrink-0 rounded-md bg-transparent px-0 py-0 dark:bg-white dark:px-2 dark:py-1">
        <img
          src={`${import.meta.env.BASE_URL}WonderLearn.png`}
          alt="Wonderlearn"
          className={cn('w-auto select-none object-contain', LOCKUP_HEIGHT[size])}
        />
      </span>
      {subtitle && (
        <span className="min-w-0 truncate text-[11px] leading-tight text-muted-foreground">
          {subtitle}
        </span>
      )}
    </span>
  )
}

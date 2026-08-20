import { cn } from '@/lib/utils'
import { ThemeToggle } from './ThemeToggle'

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  className?: string
  /** Theme control lives in the mobile bar already; hide it there. */
  showThemeToggle?: boolean
}

export function PageHeader({
  title,
  subtitle,
  actions,
  className,
  showThemeToggle = true,
}: PageHeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        {actions}
        {showThemeToggle && (
          <span className="hidden lg:inline-flex">
            <ThemeToggle />
          </span>
        )}
      </div>
    </div>
  )
}

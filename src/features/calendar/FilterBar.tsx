import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { PlatformIcon } from '@/components/shared/PlatformIcon'
import { Button } from '@/components/ui/button'
import { PLATFORM_META, STATUS_META } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  clearFilters,
  setPlatforms,
  setStatuses,
  togglePlatform,
  toggleStatus,
} from '@/store/slices/filtersSlice'
import { POST_STATUSES, SOCIAL_PLATFORMS } from '@/types'

/** Quick platform + status filters. Selection is visually obvious and reversible. */
export function FilterBar({ className }: { className?: string }) {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const activeWorkspace = useAppSelector((s) => s.settings.activeWorkspace)
  const { platforms, statuses, search } = useAppSelector((s) => s.filters)
  const isDrWael = activeWorkspace === 'dr_wael'
  const dirty = (!isDrWael && platforms.length > 0) || statuses.length > 0 || search.length > 0

  return (
    <div className={cn('flex flex-wrap items-center gap-x-2 gap-y-2', className)}>
      {!isDrWael && (
        <>
          <div
            className="flex flex-wrap items-center gap-1.5"
            role="group"
            aria-label={t('filters.platforms')}
          >
            <FilterChip active={platforms.length === 0} onClick={() => dispatch(setPlatforms([]))}>
              {t('filters.all')}
            </FilterChip>
            {SOCIAL_PLATFORMS.map((platform) => {
              const active = platforms.includes(platform)
              return (
                <FilterChip
                  key={platform}
                  active={active}
                  onClick={() => dispatch(togglePlatform(platform))}
                  aria-pressed={active}
                >
                  <PlatformIcon platform={platform} brand className="size-3.5" />
                  <span className="hidden sm:inline">{PLATFORM_META[platform].label}</span>
                </FilterChip>
              )
            })}
          </div>

          <span className="hidden h-5 w-px bg-border lg:block" />
        </>
      )}

      <div
        className="flex flex-wrap items-center gap-1.5"
        role="group"
        aria-label={t('filters.status')}
      >
        <FilterChip active={statuses.length === 0} onClick={() => dispatch(setStatuses([]))}>
          {t('filters.all')}
        </FilterChip>
        {POST_STATUSES.map((status) => {
          const active = statuses.includes(status)
          return (
            <FilterChip
              key={status}
              active={active}
              onClick={() => dispatch(toggleStatus(status))}
              aria-pressed={active}
            >
              <span className={cn('size-1.5 rounded-full', STATUS_META[status].dot)} />
              {t(STATUS_META[status].labelKey)}
            </FilterChip>
          )
        })}
      </div>

      {dirty && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground"
          onClick={() => dispatch(clearFilters())}
        >
          <X className="size-3" />
          {t('filters.clear')}
        </Button>
      )}
    </div>
  )
}

function FilterChip({
  active,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
        active
          ? 'font-semibold text-foreground'
          : 'font-medium text-muted-foreground hover:text-foreground',
        className,
      )}
      {...props}
    />
  )
}

import { useTranslation } from 'react-i18next'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Columns3,
  List,
  Plus,
  Share2,
  SlidersHorizontal,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatMonthTitle } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { CalendarViewMode } from '@/store/slices/viewSlice'
import { SearchBar } from './SearchBar'

interface CalendarHeaderProps {
  date: Date
  view: CalendarViewMode
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onViewChange: (view: CalendarViewMode) => void
  onShare?: () => void
  onAddPost?: () => void
  onToggleFilters?: () => void
  filtersOpen?: boolean
  filterCount?: number
  /** Review mode drops authoring controls. */
  readOnly?: boolean
}

const VIEW_ICON = { month: CalendarDays, week: Columns3, list: List } as const

export function CalendarHeader({
  date,
  view,
  onPrev,
  onNext,
  onToday,
  onViewChange,
  onShare,
  onAddPost,
  onToggleFilters,
  filtersOpen,
  filterCount = 0,
  readOnly = false,
}: CalendarHeaderProps) {
  const { t, i18n } = useTranslation()
  const views: CalendarViewMode[] = ['month', 'week', 'list']

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b p-3 sm:p-4">
      {/* Left: month navigation */}
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon-sm" onClick={onPrev} aria-label={t('calendar.prev')}>
          <ChevronLeft className="rtl:rotate-180" />
        </Button>
        <h2 className="min-w-40 px-1 text-center text-base font-semibold tracking-tight sm:min-w-44 sm:text-lg">
          {formatMonthTitle(date, i18n.language)}
        </h2>
        <Button variant="ghost" size="icon-sm" onClick={onNext} aria-label={t('calendar.next')}>
          <ChevronRight className="rtl:rotate-180" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="ms-1 hidden sm:inline-flex"
          onClick={onToday}
        >
          {t('calendar.today')}
        </Button>
      </div>

      {/* Right: tools */}
      <div className="ms-auto flex flex-wrap items-center gap-1.5">
        <SearchBar className="w-36 sm:w-52" />

        {onToggleFilters && (
          <Button
            variant={filtersOpen ? 'secondary' : 'ghost'}
            size="icon-sm"
            onClick={onToggleFilters}
            aria-expanded={filtersOpen}
            aria-label={t('filters.platforms')}
            className="relative"
          >
            <SlidersHorizontal />
            {filterCount > 0 && (
              <span className="absolute -end-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-primary text-[9px] font-semibold text-primary-foreground">
                {filterCount}
              </span>
            )}
          </Button>
        )}

        {/* View selector */}
        <div className="hidden items-center gap-0.5 rounded-lg bg-muted p-0.5 md:flex">
          {views.map((v) => {
            const Icon = VIEW_ICON[v]
            return (
              <button
                key={v}
                type="button"
                onClick={() => onViewChange(v)}
                aria-pressed={view === v}
                className={cn(
                  'inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
                  view === v
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="size-3.5" />
                {t(`calendar.${v}`)}
              </button>
            )
          })}
        </div>

        {/* Compact view selector on small screens */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon-sm" aria-label={t('calendar.view')}>
              {(() => {
                const Icon = VIEW_ICON[view]
                return <Icon />
              })()}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t('calendar.view')}</DropdownMenuLabel>
            {views.map((v) => {
              const Icon = VIEW_ICON[v]
              return (
                <DropdownMenuItem key={v} onSelect={() => onViewChange(v)}>
                  <Icon />
                  {t(`calendar.${v}`)}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {!readOnly && (
          <>
            {onShare && (
              <Button variant="outline" size="sm" onClick={onShare}>
                <Share2 />
                <span className="hidden lg:inline">{t('share.button')}</span>
              </Button>
            )}
            {onAddPost && (
              <Button size="sm" onClick={onAddPost}>
                <Plus />
                <span className="hidden sm:inline">{t('calendar.addToDay')}</span>
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

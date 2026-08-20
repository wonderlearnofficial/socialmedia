import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setSearch } from '@/store/slices/filtersSlice'

/** Debounced search across title, description, topic and caption. */
export function SearchBar({ className }: { className?: string }) {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const committed = useAppSelector((s) => s.filters.search)
  const [value, setValue] = useState(committed)

  // Keep local input in sync when filters are cleared elsewhere.
  useEffect(() => {
    setValue((current) => (committed === '' && current !== '' ? '' : current))
  }, [committed])

  useEffect(() => {
    if (value === committed) return
    const id = setTimeout(() => dispatch(setSearch(value)), 180)
    return () => clearTimeout(id)
  }, [value, committed, dispatch])

  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t('filters.searchPlaceholder')}
        aria-label={t('filters.search')}
        className="h-8 ps-8 pe-8 text-xs [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue('')}
          className="absolute end-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-3" />
          <span className="sr-only">{t('filters.clear')}</span>
        </button>
      )}
    </div>
  )
}

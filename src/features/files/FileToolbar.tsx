import { useTranslation } from 'react-i18next'
import {
  ArrowDownAZ,
  ArrowUpAZ,
  FileText,
  Filter,
  Folder,
  Image,
  LayoutGrid,
  List,
  Search,
  SlidersHorizontal,
  Video,
  X,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type FileFilterCategory = 'all' | 'images' | 'documents' | 'videos' | 'folders'
export type FileSortKey = 'name' | 'modified' | 'created' | 'size' | 'type'

interface FileToolbarProps {
  query: string
  onQueryChange: (query: string) => void
  category: FileFilterCategory
  onCategoryChange: (category: FileFilterCategory) => void
  sortKey: FileSortKey
  onSortKeyChange: (sortKey: FileSortKey) => void
  sortDirection: 'asc' | 'desc'
  onToggleSortDirection: () => void
  view: 'grid' | 'list'
  onViewChange: (view: 'grid' | 'list') => void
}

export function FileToolbar({
  query,
  onQueryChange,
  category,
  onCategoryChange,
  sortKey,
  onSortKeyChange,
  sortDirection,
  onToggleSortDirection,
  view,
  onViewChange,
}: FileToolbarProps) {
  const { t } = useTranslation()

  const CATEGORIES: { id: FileFilterCategory; label: string; icon: typeof Folder }[] = [
    { id: 'all', label: t('filters.all', 'All'), icon: Filter },
    { id: 'images', label: t('files.images', 'Images'), icon: Image },
    { id: 'documents', label: t('files.documents', 'Documents'), icon: FileText },
    { id: 'videos', label: t('files.videos', 'Videos'), icon: Video },
    { id: 'folders', label: t('files.folders', 'Folders'), icon: Folder },
  ]

  const SORT_OPTIONS: { key: FileSortKey; label: string }[] = [
    { key: 'name', label: t('files.sortName', 'Name') },
    { key: 'modified', label: t('files.sortModified', 'Date modified') },
    { key: 'created', label: t('files.sortCreated', 'Date created') },
    { key: 'size', label: t('files.sortSize', 'File size') },
    { key: 'type', label: t('files.sortType', 'File type') },
  ]

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Search Input */}
      <div className="relative flex-1 max-w-md">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-[#6F7782]" />
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={t('files.searchPlaceholder', 'Search files and folders...')}
          className="h-10 w-full rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#101317] pe-8 ps-9 text-xs text-white placeholder:text-[#6F7782] shadow-xs transition-all focus:border-[#009FE2] focus:outline-none focus:ring-2 focus:ring-[#009FE2]/30"
        />
        {query && (
          <button
            type="button"
            onClick={() => onQueryChange('')}
            className="absolute end-2.5 top-1/2 -translate-y-1/2 text-[#6F7782] hover:text-white"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Filter categories & view controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Category Pills (Desktop) */}
        <div className="hidden items-center gap-1 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#101317] p-1 md:flex">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon
            const active = category === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onCategoryChange(cat.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all',
                  active
                    ? 'bg-[#009FE2] text-white shadow-[0_0_10px_rgba(0,159,226,0.3)]'
                    : 'text-[#A7ADB5] hover:bg-[#181D22] hover:text-white',
                )}
              >
                <Icon className="size-3" />
                <span>{cat.label}</span>
              </button>
            )
          })}
        </div>

        {/* Sort Menu */}
        <div className="flex items-center gap-1 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#101317] p-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 rounded-lg px-2.5 text-xs text-[#A7ADB5] hover:bg-[#181D22] hover:text-white"
              >
                <SlidersHorizontal className="size-3.5 text-[#009FE2]" />
                <span className="capitalize">
                  {SORT_OPTIONS.find((s) => s.key === sortKey)?.label}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-44 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#15191E] p-1 text-white shadow-xl"
            >
              {SORT_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt.key}
                  onSelect={() => onSortKeyChange(opt.key)}
                  className={cn(
                    'cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors focus:bg-[#181D22]',
                    sortKey === opt.key
                      ? 'text-[#009FE2] font-semibold bg-[#181D22]/60'
                      : 'text-white hover:text-[#009FE2]',
                  )}
                >
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            type="button"
            onClick={onToggleSortDirection}
            title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
            className="grid size-8 place-items-center rounded-lg text-[#A7ADB5] transition-colors hover:bg-[#181D22] hover:text-white"
          >
            {sortDirection === 'asc' ? (
              <ArrowUpAZ className="size-3.5" />
            ) : (
              <ArrowDownAZ className="size-3.5" />
            )}
          </button>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#101317] p-1">
          <button
            type="button"
            aria-label={t('files.gridView', 'Grid view')}
            onClick={() => onViewChange('grid')}
            className={cn(
              'grid size-8 place-items-center rounded-lg transition-all',
              view === 'grid'
                ? 'bg-[#009FE2] text-white shadow-[0_0_10px_rgba(0,159,226,0.3)]'
                : 'text-[#6F7782] hover:bg-[#181D22] hover:text-white',
            )}
          >
            <LayoutGrid className="size-4" />
          </button>
          <button
            type="button"
            aria-label={t('files.listView', 'List view')}
            onClick={() => onViewChange('list')}
            className={cn(
              'grid size-8 place-items-center rounded-lg transition-all',
              view === 'list'
                ? 'bg-[#009FE2] text-white shadow-[0_0_10px_rgba(0,159,226,0.3)]'
                : 'text-[#6F7782] hover:bg-[#181D22] hover:text-white',
            )}
          >
            <List className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

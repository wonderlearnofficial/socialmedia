import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Plus, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WorkItem } from '@/types'
import { CreateWorkItemDialog } from './CreateWorkItemDialog'
import { filterWorkItems, type WorkItemView } from './useTimeData'

/** How many rows the panel will ever render. The selector has to stay instant
 *  with thousands of work items, so an unfiltered list is always a preview —
 *  searching, not scrolling, is how you reach the rest. */
const RECENT_LIMIT = 5
const BROWSE_LIMIT = 8
const RESULT_LIMIT = 50

interface WorkItemSelectorProps {
  value: string | null
  onSelect: (id: string | null) => void
  workItems: WorkItemView[]
  /** Work item ids the person tracked most recently, newest first. */
  recentIds?: string[]
  createdBy: string
  placeholder?: string
  id?: string
  className?: string
}

interface Row {
  view: WorkItemView
  section: 'recent' | 'all' | 'results'
}

/**
 * The "what are you working on?" field: a search-first picker that opens on
 * recent work, finds anything by work item, code, project, company or file
 * name, and creates what you typed when nothing matches.
 */
export function WorkItemSelector({
  value,
  onSelect,
  workItems,
  recentIds = [],
  createdBy,
  placeholder,
  id = 'work-item-selector',
  className,
}: WorkItemSelectorProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  const [createName, setCreateName] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const selected = workItems.find((w) => w.item.id === value) ?? null
  const trimmed = query.trim()

  const rows = useMemo<Row[]>(() => {
    if (trimmed) {
      return filterWorkItems(workItems, trimmed)
        .slice(0, RESULT_LIMIT)
        .map((view) => ({ view, section: 'results' as const }))
    }
    const byId = new Map(workItems.map((w) => [w.item.id, w]))
    const recent = recentIds
      .map((rid) => byId.get(rid))
      .filter((w): w is WorkItemView => Boolean(w))
      .slice(0, RECENT_LIMIT)
    const recentSet = new Set(recent.map((w) => w.item.id))
    const rest = workItems.filter((w) => !recentSet.has(w.item.id)).slice(0, BROWSE_LIMIT)
    return [
      ...recent.map((view) => ({ view, section: 'recent' as const })),
      ...rest.map((view) => ({ view, section: 'all' as const })),
    ]
  }, [workItems, recentIds, trimmed])

  const createIndex = rows.length
  const rowCount = rows.length + 1 // the create row is always last

  useEffect(() => {
    setHighlight(0)
  }, [query, open])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  // Keep the highlighted row in view while arrowing through a long result list.
  useEffect(() => {
    if (!open) return
    listRef.current
      ?.querySelector(`[data-index="${highlight}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [highlight, open])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const close = () => {
    setOpen(false)
    setQuery('')
  }

  const choose = (index: number) => {
    if (index === createIndex) {
      setCreateName(trimmed || '')
      return
    }
    const row = rows[index]
    if (!row) return
    onSelect(row.view.item.id)
    close()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => (h + 1) % rowCount)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => (h - 1 + rowCount) % rowCount)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      choose(highlight)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      close()
    }
  }

  const handleCreated = (item: WorkItem) => {
    // Straight from "create" to "ready to start" — no confirmation step.
    onSelect(item.id)
    setCreateName(null)
    close()
  }

  let lastSection: Row['section'] | null = null

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {!open ? (
        <button
          type="button"
          id={id}
          onClick={() => setOpen(true)}
          aria-haspopup="listbox"
          aria-expanded={false}
          className="flex h-10 w-full items-center gap-2.5 rounded-lg border border-input bg-transparent px-3 text-start text-sm transition-colors hover:border-ring/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          <Search className="size-4 shrink-0 text-muted-foreground" />
          {selected ? (
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{selected.item.name}</span>
              <span className="flex min-w-0 items-center gap-1.5 text-[11px]">
                <span
                  aria-hidden
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ background: selected.color }}
                />
                <span className="truncate font-medium" style={{ color: selected.color }}>
                  {selected.project?.name ?? '—'}
                </span>
                {selected.company?.name && (
                  <span className="truncate text-muted-foreground">· {selected.company.name}</span>
                )}
              </span>
            </span>
          ) : (
            <span className="min-w-0 flex-1 truncate text-muted-foreground">
              {placeholder ?? t('time.whatAreYouWorkingOn')}
            </span>
          )}
          {selected && (
            <span
              role="button"
              tabIndex={0}
              aria-label={t('time.clearSelection')}
              onClick={(e) => {
                e.stopPropagation()
                onSelect(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  e.stopPropagation()
                  onSelect(null)
                }
              }}
              className="shrink-0 rounded-sm text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </span>
          )}
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
      ) : (
        <div className="flex h-10 w-full items-center gap-2.5 rounded-lg border border-ring/60 bg-transparent px-3 text-sm">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t('time.searchWorkItems')}
            autoComplete="off"
            role="combobox"
            aria-expanded
            aria-controls={`${id}-listbox`}
            aria-activedescendant={`${id}-row-${highlight}`}
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </div>
      )}

      {open && (
        <div
          ref={listRef}
          id={`${id}-listbox`}
          role="listbox"
          className="absolute z-50 mt-1 max-h-80 w-full overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg"
        >
          {rows.map((row, index) => {
            const header = row.section !== lastSection ? row.section : null
            lastSection = row.section
            return (
              <div key={row.view.item.id}>
                {header && header !== 'results' && (
                  <p className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {t(header === 'recent' ? 'time.recent' : 'time.browseAll')}
                  </p>
                )}
                <button
                  type="button"
                  id={`${id}-row-${index}`}
                  data-index={index}
                  role="option"
                  aria-selected={row.view.item.id === value}
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => choose(index)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-start',
                    index === highlight && 'bg-accent text-accent-foreground',
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{row.view.item.name}</span>
                    <span className="flex min-w-0 items-center gap-1.5 text-[11px]">
                      <span
                        aria-hidden
                        className="size-1.5 shrink-0 rounded-full"
                        style={{ background: row.view.color }}
                      />
                      <span className="truncate font-medium" style={{ color: row.view.color }}>
                        {row.view.project?.name ?? '—'}
                      </span>
                      {row.view.company?.name && (
                        <span className="truncate text-muted-foreground">
                          · {row.view.company.name}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              </div>
            )
          })}

          {rows.length === 0 && (
            <p className="px-2.5 py-3 text-xs text-muted-foreground">
              {trimmed ? t('time.noWorkItemFound') : t('time.noWorkItems')}
            </p>
          )}

          <button
            type="button"
            id={`${id}-row-${createIndex}`}
            data-index={createIndex}
            onMouseEnter={() => setHighlight(createIndex)}
            onClick={() => choose(createIndex)}
            className={cn(
              'mt-1 flex w-full items-center gap-2 rounded-md border-t border-border/60 px-2.5 py-2 text-start text-sm text-primary',
              highlight === createIndex && 'bg-accent',
            )}
          >
            <Plus className="size-3.5 shrink-0" />
            <span className="truncate">
              {trimmed ? t('time.createNamed', { name: trimmed }) : t('time.createNewWorkItem')}
            </span>
          </button>
        </div>
      )}

      <CreateWorkItemDialog
        open={createName !== null}
        defaultName={createName ?? ''}
        createdBy={createdBy}
        onCreated={handleCreated}
        onClose={() => setCreateName(null)}
      />
    </div>
  )
}

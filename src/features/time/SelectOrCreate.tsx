import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, ChevronDown, Loader2, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SWATCHES } from './ColorPicker'

export interface SelectOption {
  id: string
  label: string
  /** Secondary line — the hierarchy context, a file name, a code. */
  hint?: string
}

interface SelectOrCreateProps {
  value: string | null
  options: SelectOption[]
  onSelect: (id: string | null) => void
  /** Omitted when the field can only pick from what already exists (files
   *  can't be conjured without an upload). Returns the new option's id. */
  onCreate?: (name: string, color: string) => Promise<string | null>
  /** Shows a swatch strip on the create row, so the colour is chosen at the
   *  moment of creation rather than assigned silently. */
  withColor?: boolean
  placeholder: string
  /** Rendered on the create row, e.g. `Create company "Jisraa"`. */
  createLabel?: (name: string) => string
  emptyLabel?: string
  disabled?: boolean
  allowClear?: boolean
  id?: string
  autoFocus?: boolean
}

/**
 * Type-ahead picker that falls back to creating what you typed.
 *
 * Everyone on the team can add a company, project or work item, but only after
 * searching: the create row appears at the bottom of the results, never above
 * them, so an existing entry is always the easier thing to click. That's what
 * keeps "Jisraa" from quietly becoming three different companies.
 */
export function SelectOrCreate({
  value,
  options,
  onSelect,
  onCreate,
  placeholder,
  createLabel,
  emptyLabel,
  disabled,
  allowClear,
  id,
  autoFocus,
  withColor,
}: SelectOrCreateProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  const [creating, setCreating] = useState(false)
  const [color, setColor] = useState<string>(SWATCHES[0])
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = options.find((o) => o.id === value) ?? null

  const filtered = useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
    if (terms.length === 0) return options
    return options.filter((o) => {
      const haystack = `${o.label} ${o.hint ?? ''}`.toLowerCase()
      return terms.every((term) => haystack.includes(term))
    })
  }, [options, query])

  const trimmed = query.trim()
  const alreadyExists = options.some((o) => o.label.toLowerCase() === trimmed.toLowerCase())
  const canCreate = Boolean(onCreate) && trimmed.length > 0 && !alreadyExists
  const createIndex = filtered.length

  useEffect(() => {
    setHighlight(0)
  }, [query, open])

  // Close when the click lands anywhere else — a plain listener rather than a
  // Popover, since this has to work nested inside a Dialog.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const choose = async (index: number) => {
    if (index === createIndex && canCreate && onCreate) {
      setCreating(true)
      try {
        const newId = await onCreate(trimmed, color)
        if (newId) {
          onSelect(newId)
          setQuery('')
          setOpen(false)
        }
      } finally {
        setCreating(false)
      }
      return
    }
    const option = filtered[index]
    if (!option) return
    onSelect(option.id)
    setQuery('')
    setOpen(false)
  }

  const rowCount = filtered.length + (canCreate ? 1 : 0)

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setHighlight((h) => (rowCount === 0 ? 0 : (h + 1) % rowCount))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => (rowCount === 0 ? 0 : (h - 1 + rowCount) % rowCount))
    } else if (e.key === 'Enter') {
      if (!open) return
      e.preventDefault()
      void choose(highlight)
    } else if (e.key === 'Escape') {
      if (!open) return
      e.preventDefault()
      e.stopPropagation()
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className={cn(
          'flex h-9 w-full items-center gap-2 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-within:ring-2 focus-within:ring-ring/60',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <input
          id={id}
          ref={inputRef}
          value={open ? query : (selected?.label ?? '')}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={selected ? selected.label : placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={id ? `${id}-listbox` : undefined}
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
        />
        {allowClear && selected && !open && (
          <button
            type="button"
            aria-label={t('time.clearSelection')}
            onClick={() => onSelect(null)}
            className="shrink-0 rounded-sm text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        )}
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </div>

      {open && (
        <div
          id={id ? `${id}-listbox` : undefined}
          role="listbox"
          className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg"
        >
          {filtered.length === 0 && !canCreate && (
            <p className="px-2.5 py-3 text-xs text-muted-foreground">
              {emptyLabel ?? t('time.noMatches')}
            </p>
          )}

          {filtered.map((option, index) => (
            <button
              key={option.id}
              type="button"
              role="option"
              aria-selected={option.id === value}
              onMouseEnter={() => setHighlight(index)}
              onClick={() => void choose(index)}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-start text-sm',
                index === highlight && 'bg-accent text-accent-foreground',
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate">{option.label}</span>
                {option.hint && (
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {option.hint}
                  </span>
                )}
              </span>
              {option.id === value && <Check className="size-3.5 shrink-0 text-primary" />}
            </button>
          ))}

          {canCreate && withColor && (
            <div className="flex flex-wrap items-center gap-1 border-t border-border/60 px-2.5 pb-1 pt-2">
              {SWATCHES.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  onClick={() => setColor(swatch)}
                  aria-label={swatch}
                  aria-pressed={color === swatch}
                  className={cn(
                    'grid size-5 place-items-center rounded-full border-2 transition-transform hover:scale-110',
                    color === swatch ? 'border-foreground' : 'border-transparent',
                  )}
                >
                  <span className="size-3.5 rounded-full" style={{ background: swatch }} />
                </button>
              ))}
            </div>
          )}

          {canCreate && (
            <button
              type="button"
              onMouseEnter={() => setHighlight(createIndex)}
              onClick={() => void choose(createIndex)}
              disabled={creating}
              className={cn(
                'mt-0.5 flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-start text-sm text-primary',
                !withColor && 'border-t border-border/60',
                highlight === createIndex && 'bg-accent',
              )}
            >
              {creating ? (
                <Loader2 className="size-3.5 shrink-0 animate-spin" />
              ) : withColor ? (
                <span className="size-3 shrink-0 rounded-full" style={{ background: color }} />
              ) : (
                <Plus className="size-3.5 shrink-0" />
              )}
              <span className="truncate">
                {createLabel ? createLabel(trimmed) : t('time.createNamed', { name: trimmed })}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

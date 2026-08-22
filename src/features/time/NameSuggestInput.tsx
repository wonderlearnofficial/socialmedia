import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export interface NameSuggestion {
  name: string
  /** Where this name is already used, e.g. "Jisraa · Newton". */
  hint?: string
}

interface NameSuggestInputProps {
  id?: string
  value: string
  onChange: (value: string) => void
  suggestions: NameSuggestion[]
  placeholder?: string
  /** Fired on Enter when no suggestion is highlighted. */
  onSubmit?: () => void
  autoFocus?: boolean
}

const LIMIT = 8

/**
 * A free-text name field that also offers names already in use.
 *
 * Design work repeats: "Presentation", "Flyer", "Instagram Post" recur across
 * clients and months. Retyping them by hand invites near-duplicates that differ
 * only by a typo, so previous names are offered as you type — while still
 * letting you type something entirely new, which is the common case.
 */
export function NameSuggestInput({
  id,
  value,
  onChange,
  suggestions,
  placeholder,
  onSubmit,
  autoFocus,
}: NameSuggestInputProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase()
    return suggestions
      .filter((s) => {
        // An exact match is already typed — suggesting it back is noise.
        if (s.name.toLowerCase() === q) return false
        return q === '' || s.name.toLowerCase().includes(q)
      })
      .slice(0, LIMIT)
  }, [suggestions, value])

  useEffect(() => {
    setHighlight(-1)
  }, [value])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const pick = (name: string) => {
    onChange(name)
    setOpen(false)
    setHighlight(-1)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' && matches.length) {
      e.preventDefault()
      setOpen(true)
      setHighlight((h) => (h + 1) % matches.length)
    } else if (e.key === 'ArrowUp' && matches.length) {
      e.preventDefault()
      setHighlight((h) => (h <= 0 ? matches.length - 1 : h - 1))
    } else if (e.key === 'Enter') {
      // Only steal Enter when a suggestion is actually highlighted; otherwise
      // it still submits, so typing a brand-new name stays one keystroke.
      if (open && highlight >= 0 && matches[highlight]) {
        e.preventDefault()
        pick(matches[highlight].name)
      } else {
        onSubmit?.()
      }
    } else if (e.key === 'Escape' && open) {
      e.preventDefault()
      e.stopPropagation()
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        id={id}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open && matches.length > 0}
        aria-autocomplete="list"
        autoFocus={autoFocus}
      />

      {open && matches.length > 0 && (
        <div
          role="listbox"
          className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg"
        >
          <p className="px-2.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {t('time.existingNames')}
          </p>
          {matches.map((s, index) => (
            <button
              key={s.name}
              type="button"
              role="option"
              aria-selected={index === highlight}
              onMouseEnter={() => setHighlight(index)}
              onClick={() => pick(s.name)}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-start text-sm',
                index === highlight && 'bg-accent text-accent-foreground',
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate">{s.name}</span>
                {s.hint && (
                  <span className="block truncate text-[11px] text-muted-foreground">{s.hint}</span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

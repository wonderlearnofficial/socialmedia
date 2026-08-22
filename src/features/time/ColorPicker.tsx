import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * The colours anyone can pick from.
 *
 * A fixed set rather than a free colour input: every one of these is light
 * enough to be legible as label text on the dark surface, which an arbitrary
 * hex is not. Twelve is enough to tell a dozen clients apart and few enough to
 * scan in one row.
 */
export const SWATCHES = [
  '#38BDF8',
  '#60A5FA',
  '#A78BFA',
  '#E879F9',
  '#F472B6',
  '#F87171',
  '#FB923C',
  '#FBBF24',
  '#A3E635',
  '#34D399',
  '#2DD4BF',
  '#94A3B8',
] as const

interface ColorPickerProps {
  value: string | null
  onChange: (color: string) => void
  /** Rendered as the "no explicit choice" option. */
  fallback?: string
  onClear?: () => void
  label?: string
  /** Overrides the free palette. Projects get only shades of their company's
   *  hue, so a project can never be coloured outside its family. */
  swatches?: readonly string[]
}

export function ColorPicker({
  value,
  onChange,
  fallback,
  onClear,
  label,
  swatches,
}: ColorPickerProps) {
  const { t } = useTranslation()
  const palette = swatches ?? SWATCHES

  return (
    <div role="group" aria-label={label ?? t('time.color')} className="flex flex-wrap gap-1.5">
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          aria-pressed={value === null}
          aria-label={t('time.autoColor')}
          title={t('time.autoColor')}
          className={cn(
            'grid size-6 place-items-center rounded-full border-2 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
            value === null ? 'border-foreground' : 'border-transparent',
          )}
        >
          <span
            className="size-4 rounded-full opacity-60"
            style={{ background: fallback ?? 'hsl(215 10% 58%)' }}
          />
        </button>
      )}

      {palette.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          aria-pressed={value?.toUpperCase() === color}
          aria-label={color}
          title={color}
          className={cn(
            'grid size-6 place-items-center rounded-full border-2 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
            value?.toUpperCase() === color ? 'border-foreground' : 'border-transparent',
          )}
        >
          <span className="size-4 rounded-full" style={{ background: color }}>
            {value?.toUpperCase() === color && (
              <Check className="size-4 text-black/70" strokeWidth={3} />
            )}
          </span>
        </button>
      ))}
    </div>
  )
}

import { useRef } from 'react'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

export const PIN_LENGTH = 5

interface PinFieldProps {
  id: string
  label: string
  hint?: string
  value: string
  onChange: (value: string) => void
  error?: string
  reveal?: boolean
  disabled?: boolean
  autoFocus?: boolean
}

/**
 * Five single-digit boxes rather than one masked text input.
 *
 * A PIN is entered digit by digit, so the control shows digit by digit: it
 * auto-advances, backspace steps back, arrow keys move, and pasting a whole
 * PIN fills every box. `inputMode="numeric"` gets the numeric keypad on a
 * phone, which a plain password field does not.
 */
export function PinField({
  id,
  label,
  hint,
  value,
  onChange,
  error,
  reveal,
  disabled,
  autoFocus,
}: PinFieldProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([])

  const setAt = (index: number, digit: string) => {
    const next = value.split('')
    next[index] = digit
    onChange(next.join('').slice(0, PIN_LENGTH))
    if (digit && index < PIN_LENGTH - 1) refs.current[index + 1]?.focus()
  }

  const onKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      if (value[index]) {
        setAt(index, '')
      } else if (index > 0) {
        refs.current[index - 1]?.focus()
        const next = value.split('')
        next[index - 1] = ''
        onChange(next.join(''))
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      refs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < PIN_LENGTH - 1) {
      refs.current[index + 1]?.focus()
    }
  }

  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="mb-1.5 text-[13px] font-medium">{label}</legend>
      {/* Helper text sits above the boxes, where it's read before they're
          used rather than after. */}
      {hint && (
        <p id={`${id}-hint`} className="mb-2 text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      <div className="flex gap-2" role="group" aria-describedby={`${id}-hint`}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el
            }}
            id={i === 0 ? id : `${id}-${i}`}
            type={reveal ? 'text' : 'password'}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            maxLength={1}
            autoFocus={autoFocus && i === 0}
            value={value[i] ?? ''}
            aria-label={`${label}, digit ${i + 1} of ${PIN_LENGTH}`}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${id}-error` : `${id}-hint`}
            onFocus={(e) => e.currentTarget.select()}
            onKeyDown={(e) => onKeyDown(i, e)}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '')
              if (!digits) return setAt(i, '')
              // A pasted PIN fills every box from this one onwards.
              if (digits.length > 1) {
                const merged = (value.slice(0, i) + digits).slice(0, PIN_LENGTH)
                onChange(merged)
                refs.current[Math.min(merged.length, PIN_LENGTH - 1)]?.focus()
                return
              }
              setAt(i, digits)
            }}
            className={cn(
              'size-12 rounded-lg border-2 bg-muted/40 text-center font-mono text-lg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/60 disabled:opacity-50',
              error ? 'border-destructive' : value[i] ? 'border-primary' : 'border-input',
            )}
          />
        ))}
      </div>
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-2 flex items-center gap-1.5 text-xs text-destructive"
        >
          <AlertTriangle className="size-3 shrink-0" />
          {error}
        </p>
      )}
    </fieldset>
  )
}

/**
 * Rules a PIN has to clear. Few and explainable — a rule nobody understands
 * reads as the form being broken, so each says what to do instead.
 */
export function pinProblem(pin: string): string | null {
  if (pin.length < PIN_LENGTH) return null
  if (/^(\d)\1{4}$/.test(pin)) return 'profile.pinRepeats'
  const digits = pin.split('').map(Number)
  const ascending = digits.every((d, i) => i === 0 || d === digits[i - 1] + 1)
  const descending = digits.every((d, i) => i === 0 || d === digits[i - 1] - 1)
  if (ascending || descending) return 'profile.pinRun'
  return null
}

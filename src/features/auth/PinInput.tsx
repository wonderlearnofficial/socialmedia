import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface PinInputProps {
  length?: number
  value: string
  onChange: (value: string) => void
  onComplete?: (value: string) => void
  error?: boolean
  autoFocus?: boolean
  disabled?: boolean
}

/** Five separate digit boxes — auto-advances on input, supports paste, digits only. */
export function PinInput({
  length = 5,
  value,
  onChange,
  onComplete,
  error = false,
  autoFocus = false,
  disabled = false,
}: PinInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const digits = Array.from({ length }, (_, i) => value[i] ?? '')

  useEffect(() => {
    if (!value && autoFocus && !disabled) {
      refs.current[0]?.focus()
    }
  }, [value, autoFocus, disabled])

  const setDigit = (index: number, next: string) => {
    const chars = Array.from({ length }, (_, i) => value[i] ?? '')
    chars[index] = next
    const joined = chars.join('').slice(0, length)
    onChange(joined)
    if (joined.length === length && chars.every((c) => c !== '')) {
      onComplete?.(joined)
    }
  }

  const handleChange = (index: number, raw: string) => {
    if (disabled) return
    const digit = raw.replace(/\D/g, '').slice(-1)
    setDigit(index, digit)
    if (digit && index < length - 1) refs.current[index + 1]?.focus()
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus()
      setDigit(index - 1, '')
    } else if (e.key === 'ArrowLeft' && index > 0) {
      refs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      refs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (disabled) return
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (!pasted) return
    e.preventDefault()
    onChange(pasted)
    if (pasted.length === length) onComplete?.(pasted)
    refs.current[Math.min(pasted.length, length - 1)]?.focus()
  }

  return (
    <div className="flex justify-center gap-2" onPaste={handlePaste}>
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          maxLength={1}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          value={digit}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          aria-label={`Digit ${i + 1}`}
          aria-invalid={error}
          className={cn(
            'size-12 rounded-md border border-input bg-transparent text-center text-lg font-semibold tabular-nums shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-destructive focus-visible:ring-destructive/40',
          )}
        />
      ))}
    </div>
  )
}

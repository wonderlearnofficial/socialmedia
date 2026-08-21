import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { BrandLockup } from '@/components/shared/Brand'
import { PinInput } from '@/features/auth/PinInput'
import { signInWithPin } from '@/lib/signIn'

/**
 * The manager dashboard requires a 5-digit PIN; the public review page
 * (/share/:id) never does — that split is deliberate, not an oversight.
 * One PIN, no visible "admin vs user" choice: entering the correct 5-digit PIN
 * automatically signs in without needing an extra click.
 */
export function LoginPage() {
  const { t } = useTranslation()
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const trySignIn = async (value: string) => {
    if (value.length !== 5 || pending) return
    setError(null)
    setPending(true)
    try {
      const ok = await signInWithPin(value)
      if (!ok) {
        setError(t('login.invalid'))
        setPin('')
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-background p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <BrandLockup size="lg" />
          <p className="text-sm text-muted-foreground">{t('login.subtitle')}</p>
        </div>

        <div className="space-y-4 rounded-xl border bg-card p-6 shadow-xs">
          <p className="text-center text-xs font-medium text-muted-foreground">
            {t('login.keyLabel')}
          </p>
          <PinInput
            value={pin}
            onChange={(val) => {
              setError(null)
              setPin(val)
            }}
            onComplete={trySignIn}
            error={Boolean(error)}
            disabled={pending}
            autoFocus
          />

          <div className="flex min-h-5 items-center justify-center">
            {pending ? (
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground animate-pulse">
                <Loader2 className="size-3.5 animate-spin" />
                <span>{t('login.verifying', 'Verifying PIN…')}</span>
              </div>
            ) : error ? (
              <p className="text-center text-xs font-medium text-destructive">{error}</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

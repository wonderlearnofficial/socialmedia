import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { BrandLockup } from '@/components/shared/Brand'
import { Button } from '@/components/ui/button'
import { PinInput } from '@/features/auth/PinInput'
import { signInWithPin } from '@/lib/signIn'

/**
 * The manager dashboard requires a 5-digit PIN; the public review page
 * (/share/:id) never does — that split is deliberate, not an oversight.
 * One PIN, no visible "admin vs user" choice: whichever of the two fixed
 * accounts it matches decides the signed-in identity.
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

        <form
          onSubmit={(e) => {
            e.preventDefault()
            trySignIn(pin)
          }}
          className="space-y-4 rounded-xl border bg-card p-5"
        >
          <p className="text-center text-xs font-medium text-muted-foreground">
            {t('login.keyLabel')}
          </p>
          <PinInput
            value={pin}
            onChange={setPin}
            onComplete={trySignIn}
            error={Boolean(error)}
            autoFocus
          />
          {error && <p className="text-center text-xs font-medium text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={pending || pin.length !== 5}>
            {pending && <Loader2 className="animate-spin" />}
            {t('login.submit')}
          </Button>
        </form>
      </div>
    </div>
  )
}
